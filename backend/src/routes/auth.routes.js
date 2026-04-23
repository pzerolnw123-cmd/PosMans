const crypto = require("node:crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { hashPassword, hashPin, normalizeUsername, verifyPassword, verifyPin } = require("../utils/password");
const {
  createSession,
  deleteSession,
  deleteAllSessionsForUser,
  getSessionFromToken,
  setSessionCookie,
  clearSessionCookie,
} = require("../utils/session");
const { issueCsrfToken, setCsrfCookie, clearCsrfCookie } = require("../utils/csrf");
const { writeAuditLog } = require("../utils/audit");
const { requireAuth, requireStoreRole } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { deleteR2Object } = require("../lib/r2");
const { AppError } = require("../utils/app-error");
const { assertSafePlainText, safeUrlSchema } = require("../utils/xss");
const { env } = require("../config/env");

const router = express.Router();
const LOGIN_CHALLENGE_COOKIE_NAME = `${env.SESSION_COOKIE_NAME}_login_challenge`;
const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const passwordLoginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128),
});

const pinVerifySchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
});

const pinSetupSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
  confirmPin: z.string().regex(/^\d{6}$/),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .strict();

const ownerProfileSchema = z
  .object({
    storeName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) => assertSafePlainText(value, "storeName")),
    ownerName: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .transform((value) => assertSafePlainText(value, "ownerName")),
  })
  .strict();

const promptPayRecipientTypes = ["MOBILE", "NATIONAL_ID", "TAX_ID", "STATIC_QR", "BANK_ACCOUNT"];
const nullablePlainText = (fieldName, max = 120) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value ? assertSafePlainText(value, fieldName) : null))
    .nullable()
    .optional()
    .transform((value) => value || null);
const nullableDigitText = (max = 32) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value.replace(/[\s-]/g, ""))
    .nullable()
    .optional()
    .transform((value) => value || null);

const ownerPaymentSettingsSchema = z
  .object({
    promptPayEnabled: z.boolean(),
    promptPayRecipientType: z.enum(promptPayRecipientTypes).default("MOBILE"),
    promptPayId: nullableDigitText(24),
    promptPayMobileId: nullableDigitText(24),
    promptPayNationalId: nullableDigitText(24),
    promptPayTaxId: nullableDigitText(24),
    bankName: nullablePlainText("bankName", 80),
    bankAccountName: nullablePlainText("bankAccountName", 120),
    bankAccountNumber: nullableDigitText(32),
    paymentQrImageUrl: z.preprocess((value) => (value === "" ? null : value), safeUrlSchema("paymentQrImageUrl").nullable().optional()).transform((value) => value || null),
    paymentQrUploadedKey: z.string().trim().max(255).nullable().optional().transform((value) => value || null),
  })
  .strict()
  .transform((value) => {
    const normalized = { ...value };

    if (normalized.promptPayRecipientType !== "STATIC_QR") {
      normalized.paymentQrImageUrl = null;
      normalized.paymentQrUploadedKey = null;
    }

    if (normalized.promptPayRecipientType !== "BANK_ACCOUNT") {
      normalized.bankName = null;
      normalized.bankAccountName = null;
      normalized.bankAccountNumber = null;
    }

    return normalized;
  })
  .superRefine((value, context) => {
    if (value.promptPayMobileId && !/^\d+$/.test(value.promptPayMobileId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "Mobile PromptPay ID must contain digits only" });
    }

    if (value.promptPayNationalId && !/^\d+$/.test(value.promptPayNationalId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "National ID PromptPay must contain digits only" });
    }

    if (value.promptPayTaxId && !/^\d+$/.test(value.promptPayTaxId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "Tax ID PromptPay must contain digits only" });
    }

    if (value.bankAccountNumber && !/^\d+$/.test(value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Bank account number must contain digits only" });
    }

    if (value.promptPayMobileId && !/^0\d{9}$/.test(value.promptPayMobileId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "Mobile PromptPay ID must be a 10-digit Thai mobile number" });
    }

    if (value.promptPayNationalId && !/^\d{13}$/.test(value.promptPayNationalId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "National ID PromptPay must be 13 digits" });
    }

    if (value.promptPayTaxId && !/^\d{13}$/.test(value.promptPayTaxId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "Tax ID PromptPay must be 13 digits" });
    }

    if (value.bankAccountNumber && !/^\d{6,20}$/.test(value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Bank account number must be 6-20 digits" });
    }

    if (!value.promptPayEnabled) {
      return;
    }

    if (value.promptPayRecipientType === "MOBILE" && !value.promptPayMobileId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "Mobile PromptPay ID is required when QR PromptPay is enabled" });
    }

    if (value.promptPayRecipientType === "NATIONAL_ID" && !value.promptPayNationalId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "National ID PromptPay is required when QR PromptPay is enabled" });
    }

    if (value.promptPayRecipientType === "TAX_ID" && !value.promptPayTaxId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "Tax ID PromptPay is required when QR PromptPay is enabled" });
    }

    if (value.promptPayRecipientType === "STATIC_QR" && (!value.paymentQrImageUrl || !value.paymentQrUploadedKey)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentQrImageUrl"], message: "Static QR image is required when this recipient type is selected" });
    }

    if (value.promptPayRecipientType === "BANK_ACCOUNT" && (!value.bankName || !value.bankAccountName || !value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Bank transfer details are required when this recipient type is selected" });
    }
  });

const ownerLogoSchema = z
  .object({
    logoUrl: safeUrlSchema("logoUrl"),
    uploadedKey: z.string().min(1).max(255),
  })
  .strict();

const storePaymentSelect = {
  id: true,
  promptPayEnabled: true,
  promptPayRecipientType: true,
  promptPayId: true,
  promptPayMobileId: true,
  promptPayNationalId: true,
  promptPayTaxId: true,
  bankName: true,
  bankAccountName: true,
  bankAccountNumber: true,
  paymentQrImageUrl: true,
  paymentQrUploadedKey: true,
};

function ownerUploadPrefix(storeId) {
  return `stores/${storeId}/uploads/`;
}

function assertOwnedUploadedKey(storeId, uploadedKey) {
  if (!uploadedKey.startsWith(ownerUploadPrefix(storeId))) {
    throw new AppError("Uploaded file does not belong to this store", 403, { code: "UPLOAD_SCOPE_MISMATCH" });
  }
}

function assertUrlMatchesUploadedKey(uploadedKey, publicUrl) {
  if (!env.R2_PUBLIC_BASE_URL) {
    return;
  }

  const expectedUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${uploadedKey}`;
  if (publicUrl !== expectedUrl) {
    throw new AppError("Logo URL does not match uploaded file", 400, { code: "UPLOAD_URL_MISMATCH" });
  }
}

function loginChallengeCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

function hashChallengeToken(value) {
  return crypto.createHmac("sha256", env.SESSION_HASH_SECRET).update(value).digest("hex");
}

async function cleanupExpiredLoginChallenges() {
  await prisma.loginChallenge.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}

async function createLoginChallenge(userId) {
  await cleanupExpiredLoginChallenges();
  await prisma.loginChallenge.deleteMany({ where: { userId } });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + LOGIN_CHALLENGE_TTL_MS);

  await prisma.loginChallenge.create({
    data: {
      userId,
      tokenHash: hashChallengeToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

async function getLoginChallenge(token) {
  if (!token) return null;
  await cleanupExpiredLoginChallenges();

  const challenge = await prisma.loginChallenge.findUnique({
    where: { tokenHash: hashChallengeToken(token) },
    include: {
      user: {
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              logoUploadedKey: true,
              promptPayEnabled: true,
              promptPayRecipientType: true,
              promptPayId: true,
              promptPayMobileId: true,
              promptPayNationalId: true,
              promptPayTaxId: true,
              bankName: true,
              bankAccountName: true,
              bankAccountNumber: true,
              paymentQrImageUrl: true,
              paymentQrUploadedKey: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!challenge || challenge.expiresAt <= new Date()) {
    await deleteLoginChallenge(token).catch(() => undefined);
    return null;
  }

  return challenge;
}

async function deleteLoginChallenge(token) {
  if (!token) return;
  await prisma.loginChallenge.deleteMany({ where: { tokenHash: hashChallengeToken(token) } });
}

function setLoginChallengeCookie(res, token, expiresAt) {
  res.cookie(LOGIN_CHALLENGE_COOKIE_NAME, token, loginChallengeCookieOptions(expiresAt));
}

function clearLoginChallengeCookie(res) {
  res.clearCookie(LOGIN_CHALLENGE_COOKIE_NAME, loginChallengeCookieOptions(new Date(0)));
}

function buildPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    platformRole: user.platformRole,
    storeRole: user.storeRole,
    storeId: user.storeId,
    store: user.store
      ? {
          id: user.store.id,
          name: user.store.name,
          slug: user.store.slug,
          logoUrl: user.store.logoUrl,
          logoUploadedKey: user.store.logoUploadedKey,
          promptPayEnabled: user.store.promptPayEnabled,
          promptPayRecipientType: user.store.promptPayRecipientType,
          promptPayId: user.store.promptPayId,
          promptPayMobileId: user.store.promptPayMobileId,
          promptPayNationalId: user.store.promptPayNationalId,
          promptPayTaxId: user.store.promptPayTaxId,
          bankName: user.store.bankName,
          bankAccountName: user.store.bankAccountName,
          bankAccountNumber: user.store.bankAccountNumber,
          paymentQrImageUrl: user.store.paymentQrImageUrl,
          paymentQrUploadedKey: user.store.paymentQrUploadedKey,
        }
      : null,
  };
}

const ipLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts from this IP" },
});

const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => normalizeUsername(req.body?.username || "unknown"),
  message: { error: "Too many login attempts for this account" },
});

const pinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many PIN attempts. Please sign in again." },
});

router.get("/csrf", requireTrustedOrigin, async (req, res, next) => {
  try {
    const token = issueCsrfToken();
    setCsrfCookie(res, token);
    await writeAuditLog({
      action: "CSRF_ISSUED",
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
    });
    res.set("Cache-Control", "no-store");
    res.json({ csrfToken: token });
  } catch (error) {
    next(error);
  }
});

router.post("/login", requireTrustedOrigin, requireCsrf, ipLoginLimiter, accountLoginLimiter, async (req, res, next) => {
  try {
    const parsed = passwordLoginSchema.parse(req.body);
    const normalizedUsername = normalizeUsername(parsed.username);
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            logoUploadedKey: true,
            promptPayEnabled: true,
            promptPayRecipientType: true,
            promptPayId: true,
            promptPayMobileId: true,
            promptPayNationalId: true,
            promptPayTaxId: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
            paymentQrImageUrl: true,
            paymentQrUploadedKey: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.isActive || (user.storeRole && (!user.store || !user.store.isActive))) {
      await writeAuditLog({
        action: "LOGIN_FAILED",
        status: "denied",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: { reason: "missing_or_inactive_user", username: normalizedUsername, stage: "password" },
      });
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const validPassword = await verifyPassword(parsed.password, user.passwordHash);
    if (!validPassword) {
      await writeAuditLog({
        action: "LOGIN_FAILED",
        actorUserId: user.id,
        status: "denied",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: { reason: "bad_password", username: normalizedUsername, stage: "password" },
      });
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const challenge = await createLoginChallenge(user.id);
    setLoginChallengeCookie(res, challenge.token, challenge.expiresAt);

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      pinRequired: Boolean(user.pinHash),
      pinSetupRequired: !user.pinHash,
      challengeExpiresAt: challenge.expiresAt.toISOString(),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/setup-pin", requireTrustedOrigin, requireCsrf, pinLimiter, async (req, res, next) => {
  try {
    const parsed = pinSetupSchema.parse(req.body);
    if (parsed.pin !== parsed.confirmPin) {
      return res.status(400).json({ error: "PIN confirmation does not match." });
    }

    const challengeToken = req.cookies?.[LOGIN_CHALLENGE_COOKIE_NAME];
    const challenge = await getLoginChallenge(challengeToken);

    if (!challenge) {
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "Login challenge expired. Please sign in again." });
    }

    const user = challenge.user;
    if (!user || !user.isActive || (user.storeRole && (!user.store || !user.store.isActive))) {
      await deleteLoginChallenge(challengeToken);
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "Account is not available." });
    }

    if (user.pinHash) {
      return res.status(409).json({ error: "PIN already exists for this account." });
    }

    const newPinHash = await hashPin(parsed.pin);
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: newPinHash },
    });

    await deleteLoginChallenge(challengeToken);
    clearLoginChallengeCookie(res);

    const session = await createSession({
      userId: user.id,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    setSessionCookie(res, session.token, session.expiresAt);

    const csrfToken = issueCsrfToken();
    setCsrfCookie(res, csrfToken);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({
      action: "LOGIN_SUCCEEDED",
      actorUserId: user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      metadata: { stage: "pin_setup", username: user.username },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      csrfToken,
      user: buildPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/verify-pin", requireTrustedOrigin, requireCsrf, pinLimiter, async (req, res, next) => {
  try {
    const parsed = pinVerifySchema.parse(req.body);
    const challengeToken = req.cookies?.[LOGIN_CHALLENGE_COOKIE_NAME];
    const challenge = await getLoginChallenge(challengeToken);

    if (!challenge) {
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "Login challenge expired. Please sign in again." });
    }

    const user = challenge.user;
    if (!user || !user.isActive || (user.storeRole && (!user.store || !user.store.isActive))) {
      await deleteLoginChallenge(challengeToken);
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "Account is not available." });
    }

    if (!user.pinHash) {
      return res.status(409).json({ error: "PIN setup is required for this account." });
    }

    const validPin = await verifyPin(parsed.pin, user.pinHash);
    if (!validPin) {
      await writeAuditLog({
        action: "LOGIN_FAILED",
        actorUserId: user.id,
        status: "denied",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: { reason: "bad_pin", username: user.username, stage: "pin" },
      });
      return res.status(401).json({ error: "Invalid PIN" });
    }

    await deleteLoginChallenge(challengeToken);
    clearLoginChallengeCookie(res);

    const session = await createSession({
      userId: user.id,
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    setSessionCookie(res, session.token, session.expiresAt);

    const csrfToken = issueCsrfToken();
    setCsrfCookie(res, csrfToken);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await writeAuditLog({
      action: "LOGIN_SUCCEEDED",
      actorUserId: user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      metadata: { stage: "pin", username: user.username },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      csrfToken,
      user: buildPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", requireTrustedOrigin, requireCsrf, async (req, res, next) => {
  try {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME];
    const session = await getSessionFromToken(token);
    await deleteSession(token);
    clearSessionCookie(res);
    clearCsrfCookie(res);
    clearLoginChallengeCookie(res);
    if (session) {
      await writeAuditLog({
        action: "LOGOUT",
        actorUserId: session.user.id,
        status: "success",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        metadata: { username: session.user.username },
      });
    }
    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/logout-all", requireTrustedOrigin, requireCsrf, requireAuth, async (req, res, next) => {
  try {
    await deleteAllSessionsForUser(req.session.user.id);
    clearSessionCookie(res);
    clearCsrfCookie(res);
    clearLoginChallengeCookie(res);
    await prisma.loginChallenge.deleteMany({ where: { userId: req.session.user.id } });
    await writeAuditLog({
      action: "LOGOUT_ALL",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      metadata: { username: req.session.user.username },
    });
    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/password", requireTrustedOrigin, requireCsrf, requireAuth, async (req, res, next) => {
  try {
    const parsed = passwordChangeSchema.parse(req.body);
    if (parsed.newPassword !== parsed.confirmPassword) {
      return res.status(400).json({ error: "Password confirmation does not match." });
    }

    if (parsed.currentPassword === parsed.newPassword) {
      return res.status(400).json({ error: "New password must be different from the current password." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validPassword = await verifyPassword(parsed.currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.newPassword) },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-profile", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerProfileSchema.parse(req.body);
    const storeId = req.session.user.storeId;

    const [store, user] = await prisma.$transaction([
      prisma.store.update({
        where: { id: storeId },
        data: { name: parsed.storeName },
        select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
      }),
      prisma.user.update({
        where: { id: req.session.user.id },
        data: { displayName: parsed.ownerName },
        select: { id: true, displayName: true },
      }),
    ]);

    await writeAuditLog({
      action: "STORE_PROFILE_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: { storeName: store.name, ownerUserId: user.id },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        store,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-logo", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerLogoSchema.parse(req.body);
    const storeId = req.session.user.storeId;
    assertOwnedUploadedKey(storeId, parsed.uploadedKey);
    assertUrlMatchesUploadedKey(parsed.uploadedKey, parsed.logoUrl);

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, logoUploadedKey: true },
    });

    if (!existingStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        logoUrl: parsed.logoUrl,
        logoUploadedKey: parsed.uploadedKey,
      },
      select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
    });

    if (existingStore.logoUploadedKey && existingStore.logoUploadedKey !== parsed.uploadedKey) {
      await deleteR2Object(existingStore.logoUploadedKey);
    }

    await writeAuditLog({
      action: "STORE_LOGO_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: { uploadedKey: parsed.uploadedKey },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, store });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-payment-settings", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerPaymentSettingsSchema.parse(req.body);
    const storeId = req.session.user.storeId;

    if (parsed.paymentQrUploadedKey) {
      assertOwnedUploadedKey(storeId, parsed.paymentQrUploadedKey);
    }

    if (parsed.paymentQrUploadedKey && parsed.paymentQrImageUrl) {
      assertUrlMatchesUploadedKey(parsed.paymentQrUploadedKey, parsed.paymentQrImageUrl);
    }

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, paymentQrUploadedKey: true },
    });

    if (!existingStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    const shouldRemoveQr = existingStore.paymentQrUploadedKey && existingStore.paymentQrUploadedKey !== parsed.paymentQrUploadedKey;
    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        promptPayEnabled: parsed.promptPayEnabled,
        promptPayRecipientType: parsed.promptPayRecipientType,
        promptPayId:
          parsed.promptPayRecipientType === "MOBILE"
            ? parsed.promptPayMobileId
            : parsed.promptPayRecipientType === "NATIONAL_ID"
              ? parsed.promptPayNationalId
              : parsed.promptPayRecipientType === "TAX_ID"
                ? parsed.promptPayTaxId
                : null,
        promptPayMobileId: parsed.promptPayMobileId,
        promptPayNationalId: parsed.promptPayNationalId,
        promptPayTaxId: parsed.promptPayTaxId,
        bankName: parsed.bankName,
        bankAccountName: parsed.bankAccountName,
        bankAccountNumber: parsed.bankAccountNumber,
        paymentQrImageUrl: parsed.paymentQrImageUrl,
        paymentQrUploadedKey: parsed.paymentQrUploadedKey,
      },
      select: storePaymentSelect,
    });

    if (shouldRemoveQr) {
      await deleteR2Object(existingStore.paymentQrUploadedKey);
    }

    await writeAuditLog({
      action: "STORE_PAYMENT_SETTINGS_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: {
        promptPayEnabled: store.promptPayEnabled,
        promptPayRecipientType: store.promptPayRecipientType,
        hasPromptPayMobileId: Boolean(store.promptPayMobileId),
        hasPromptPayNationalId: Boolean(store.promptPayNationalId),
        hasPromptPayTaxId: Boolean(store.promptPayTaxId),
        hasBankAccount: Boolean(store.bankAccountNumber),
        hasStaticQr: Boolean(store.paymentQrUploadedKey),
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, store });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({
      user: req.session.user,
      session: { expiresAt: req.session.expiresAt },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
