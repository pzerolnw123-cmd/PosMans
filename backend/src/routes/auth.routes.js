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

const ownerLogoSchema = z
  .object({
    logoUrl: safeUrlSchema("logoUrl"),
    uploadedKey: z.string().min(1).max(255),
  })
  .strict();

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
