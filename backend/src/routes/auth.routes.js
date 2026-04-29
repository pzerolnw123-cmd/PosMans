const express = require("express");
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
const { requireAuth } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const {
  LOGIN_CHALLENGE_COOKIE_NAME,
  passwordLoginSchema,
  pinVerifySchema,
  pinSetupSchema,
  passwordChangeSchema,
  createLoginChallenge,
  getLoginChallenge,
  deleteLoginChallenge,
  setLoginChallengeCookie,
  clearLoginChallengeCookie,
  buildPublicUser,
  buildSessionUserResponse,
  ipLoginLimiter,
  accountLoginLimiter,
  pinLimiter,
} = require("./auth.route-helpers");
const { registerOwnerSettingsRoutes } = require("./auth.owner-settings-routes");
const { env } = require("../config/env");

const router = express.Router();

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
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
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
      return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
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
      return res.status(400).json({ error: "PIN ทั้งสองชุดไม่ตรงกัน" });
    }

    const challengeToken = req.cookies?.[LOGIN_CHALLENGE_COOKIE_NAME];
    const challenge = await getLoginChallenge(challengeToken);

    if (!challenge) {
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }

    const user = challenge.user;
    if (!user || !user.isActive || (user.storeRole && (!user.store || !user.store.isActive))) {
      await deleteLoginChallenge(challengeToken);
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "ไม่สามารถใช้งานบัญชีนี้ได้" });
    }

    if (user.pinHash) {
      return res.status(409).json({ error: "บัญชีนี้ตั้งค่า PIN แล้ว" });
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
      return res.status(401).json({ error: "เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }

    const user = challenge.user;
    if (!user || !user.isActive || (user.storeRole && (!user.store || !user.store.isActive))) {
      await deleteLoginChallenge(challengeToken);
      clearLoginChallengeCookie(res);
      return res.status(401).json({ error: "ไม่สามารถใช้งานบัญชีนี้ได้" });
    }

    if (!user.pinHash) {
      return res.status(409).json({ error: "ต้องตั้งค่า PIN ก่อนเข้าใช้งาน" });
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
      return res.status(401).json({ error: "PIN ไม่ถูกต้อง" });
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
      return res.status(400).json({ error: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน" });
    }

    if (parsed.currentPassword === parsed.newPassword) {
      return res.status(400).json({ error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.user.id },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" });
    }

    const validPassword = await verifyPassword(parsed.currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.newPassword) },
    });

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        id: { not: req.session.id },
      },
    });

    await writeAuditLog({
      action: "PASSWORD_CHANGED",
      actorUserId: user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      metadata: { revokedOtherSessions: true },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});


registerOwnerSettingsRoutes(router);

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    res.set("Cache-Control", "no-store");
    res.json({
      user: buildSessionUserResponse(req.session.user),
      session: { expiresAt: req.session.expiresAt },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
