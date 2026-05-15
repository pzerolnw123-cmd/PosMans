const crypto = require("node:crypto");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { prisma } = require("../lib/db");
const { normalizeUsername } = require("../utils/password");
const { AppError } = require("../utils/app-error");
const { assertSafePlainText, safeUrlSchema } = require("../utils/xss");
const { assertNoProfanity } = require("../utils/profanity-filter");
const { env } = require("../config/env");

const LOGIN_CHALLENGE_COOKIE_NAME = `${env.SESSION_COOKIE_NAME}_login_challenge`;
const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const passwordLoginSchema = z.object({
  username: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(128),
});

const ownerRegistrationSchema = z
  .object({
    storeName: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .transform((value) => assertSafePlainText(value, "storeName")),
    ownerName: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .transform((value) => assertSafePlainText(value, "ownerName")),
    username: z
      .string()
      .trim()
      .min(3)
      .max(32)
      .regex(/^[a-zA-Z0-9._-]+$/)
      .transform((value) => assertNoProfanity(normalizeUsername(value), "username")),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
      });
    }
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

const ownerThemeSchema = z
  .object({
    theme: z.enum(["violet", "light", "dark", "mono", "green_white", "orange_pink"]),
  })
  .strict();

const lineRecipientTypes = ["USER", "GROUP", "ROOM"];
const lineRecipientPattern = /^(U[0-9a-f]{32}|C[0-9a-f]{32}|R[0-9a-f]{32})$/i;
const lineRecipientPrefixByType = {
  USER: "U",
  GROUP: "C",
  ROOM: "R",
};
const ownerLineSettingsSchema = z
  .object({
    enabled: z.boolean(),
    notifyOnSalePaid: z.boolean().default(true),
    recipientType: z.enum(lineRecipientTypes).default("USER"),
    recipientId: z
      .string()
      .trim()
      .max(80)
      .transform((value) => value || null)
      .nullable()
      .optional(),
    channelAccessToken: z
      .string()
      .trim()
      .max(600)
      .transform((value) => value || null)
      .nullable()
      .optional(),
    clearChannelAccessToken: z.boolean().optional().default(false),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.recipientId && !lineRecipientPattern.test(value.recipientId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientId"],
        message: "LINE recipient ID ต้องเป็น userId, groupId หรือ roomId ที่ LINE ออกให้",
      });
    }

    if (value.recipientId && value.recipientType && value.recipientId[0]?.toUpperCase() !== lineRecipientPrefixByType[value.recipientType]) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientId"],
        message: "LINE recipient ID ต้องตรงกับประเภทปลายทางที่เลือก",
      });
    }

    if (!value.enabled) {
      return;
    }

    if (!value.recipientId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["recipientId"], message: "กรอก LINE recipient ID ก่อนเปิดแจ้งเตือน" });
    }
  });

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

    return normalized;
  })
  .superRefine((value, context) => {
    if (value.promptPayMobileId && !/^\d+$/.test(value.promptPayMobileId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "กรอกเบอร์พร้อมเพย์เป็นตัวเลขเท่านั้น" });
    }

    if (value.promptPayNationalId && !/^\d+$/.test(value.promptPayNationalId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "กรอกเลขพร้อมเพย์เป็นตัวเลขเท่านั้น" });
    }

    if (value.promptPayTaxId && !/^\d+$/.test(value.promptPayTaxId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "กรอกเลขพร้อมเพย์เป็นตัวเลขเท่านั้น" });
    }

    if (value.bankAccountNumber && !/^\d+$/.test(value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "กรอกเลขบัญชีเป็นตัวเลขเท่านั้น" });
    }

    if (value.promptPayMobileId && !/^0\d{9}$/.test(value.promptPayMobileId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "เบอร์พร้อมเพย์ต้องเป็นเบอร์มือถือไทย 10 หลัก" });
    }

    if (value.promptPayNationalId && !/^\d{13}$/.test(value.promptPayNationalId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "เลขพร้อมเพย์ต้องมี 13 หลัก" });
    }

    if (value.promptPayTaxId && !/^\d{13}$/.test(value.promptPayTaxId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "เลขพร้อมเพย์ต้องมี 13 หลัก" });
    }

    if (value.bankAccountNumber && !/^\d{6,20}$/.test(value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "เลขบัญชีต้องมี 6-20 หลัก" });
    }

    if (!value.promptPayEnabled) {
      return;
    }

    if (value.promptPayRecipientType === "MOBILE" && !value.promptPayMobileId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayMobileId"], message: "กรอกเบอร์พร้อมเพย์ก่อนเปิดใช้งาน" });
    }

    if (value.promptPayRecipientType === "NATIONAL_ID" && !value.promptPayNationalId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayNationalId"], message: "กรอกเลขพร้อมเพย์ก่อนเปิดใช้งาน" });
    }

    if (value.promptPayRecipientType === "TAX_ID" && !value.promptPayTaxId) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["promptPayTaxId"], message: "กรอกเลขพร้อมเพย์ก่อนเปิดใช้งาน" });
    }

    if (value.promptPayRecipientType === "STATIC_QR" && (!value.paymentQrImageUrl || !value.paymentQrUploadedKey)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["paymentQrImageUrl"], message: "อัปโหลดรูป QR ก่อนเปิดใช้งาน" });
    }

    if (value.promptPayRecipientType === "BANK_ACCOUNT" && (!value.bankName || !value.bankAccountName || !value.bankAccountNumber)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "กรอกข้อมูลบัญชีธนาคารให้ครบก่อนเปิดใช้งาน" });
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
};

function ownerUploadPrefix(storeId) {
  return `stores/${storeId}/uploads/`;
}

function assertOwnedUploadedKey(storeId, uploadedKey) {
  if (!uploadedKey.startsWith(ownerUploadPrefix(storeId))) {
    throw new AppError("ไม่สามารถใช้ไฟล์นี้ได้", 403, { code: "UPLOAD_SCOPE_MISMATCH" });
  }
}

function assertUrlMatchesUploadedKey(uploadedKey, publicUrl) {
  if (!env.R2_PUBLIC_BASE_URL) {
    return;
  }

  const expectedUrl = `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${uploadedKey}`;
  if (publicUrl !== expectedUrl) {
    throw new AppError("ข้อมูลรูปภาพไม่ถูกต้อง กรุณาอัปโหลดใหม่", 400, { code: "UPLOAD_URL_MISMATCH" });
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
    ownerTheme: user.ownerTheme,
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

function buildSessionUserResponse(user) {
  if (!user?.store) {
    return user;
  }

  const {
    promptPayId,
    promptPayMobileId,
    promptPayNationalId,
    promptPayTaxId,
    bankAccountName,
    bankAccountNumber,
    paymentQrImageUrl,
    ...store
  } = user.store;

  return {
    ...user,
    store,
  };
}

const ipLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

const accountLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => normalizeUsername(req.body?.username || "unknown"),
  message: { error: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "สมัครสมาชิกบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

function pinRateLimitKey(req) {
  // ผูก rate limit กับ login challenge เพื่อลดผลกระทบผู้ใช้ที่แชร์ IP เดียวกัน
  const challengeToken = req.cookies?.[LOGIN_CHALLENGE_COOKIE_NAME] || "no-challenge";
  const ipKey = rateLimit.ipKeyGenerator ? rateLimit.ipKeyGenerator(req.ip) : req.ip || "unknown";
  return `${challengeToken}:${ipKey}`;
}

const pinLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: pinRateLimitKey,
  message: { error: "พยายามกรอก PIN บ่อยเกินไป กรุณาเข้าสู่ระบบใหม่" },
});

module.exports = {
  LOGIN_CHALLENGE_COOKIE_NAME,
  passwordLoginSchema,
  ownerRegistrationSchema,
  pinVerifySchema,
  pinSetupSchema,
  passwordChangeSchema,
  ownerProfileSchema,
  ownerThemeSchema,
  ownerLineSettingsSchema,
  ownerPaymentSettingsSchema,
  ownerLogoSchema,
  storePaymentSelect,
  assertOwnedUploadedKey,
  assertUrlMatchesUploadedKey,
  createLoginChallenge,
  getLoginChallenge,
  deleteLoginChallenge,
  setLoginChallengeCookie,
  clearLoginChallengeCookie,
  buildPublicUser,
  buildSessionUserResponse,
  ipLoginLimiter,
  accountLoginLimiter,
  registrationLimiter,
  pinLimiter,
};
