const crypto = require("node:crypto");
const { prisma } = require("../lib/db");
const { env } = require("../config/env");
const { revokeDisplaysForSessionIds } = require("./customer-display");

const EXPIRED_SESSION_CLEANUP_INTERVAL_MS = 60 * 1000;
const SESSION_REFRESH_THRESHOLD_MS = Math.min(5 * 60 * 1000, Math.floor(env.SESSION_IDLE_TIMEOUT_MS / 2));

let lastExpiredSessionCleanupAt = 0;
let expiredSessionCleanupPromise = null;

function hashToken(value) {
  return crypto.createHmac("sha256", env.SESSION_HASH_SECRET).update(value).digest("hex");
}

const sessionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  ownerTheme: true,
  platformRole: true,
  storeRole: true,
  storeId: true,
  isActive: true,
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      logoUploadedKey: true,
      promptPayEnabled: true,
      promptPayRecipientType: true,
      bankName: true,
      paymentQrUploadedKey: true,
      isActive: true,
    },
  },
};

function cookieOptions(expiresAt) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  };
}

async function cleanupExpiredSessions() {
  const now = Date.now();
  if (now - lastExpiredSessionCleanupAt < EXPIRED_SESSION_CLEANUP_INTERVAL_MS) {
    return expiredSessionCleanupPromise || null;
  }

  lastExpiredSessionCleanupAt = now;
  expiredSessionCleanupPromise = (async () => {
    const expiredSessions = await prisma.session.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true },
    });

    if (expiredSessions.length === 0) {
      return { count: 0 };
    }

    await revokeDisplaysForSessionIds(expiredSessions.map((session) => session.id));

    return prisma.session.deleteMany({
      where: {
        id: { in: expiredSessions.map((session) => session.id) },
      },
    });
  })().finally(() => {
    expiredSessionCleanupPromise = null;
  });

  return expiredSessionCleanupPromise;
}

function calculateSessionExpiry(now, createdAt = now) {
  const idleDeadline = new Date(now.getTime() + env.SESSION_IDLE_TIMEOUT_MS);
  const absoluteDeadline = new Date(createdAt.getTime() + env.SESSION_ABSOLUTE_TIMEOUT_MS);
  return idleDeadline < absoluteDeadline ? idleDeadline : absoluteDeadline;
}

async function createSession({ userId, userAgent, ipAddress }) {
  await cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = calculateSessionExpiry(now);

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return { token, expiresAt, tokenHash };
}

async function deleteSession(token) {
  if (!token) return;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true },
  });

  if (!session) {
    return;
  }

  await revokeDisplaysForSessionIds([session.id]);
  await prisma.session.delete({ where: { id: session.id } });
}

async function deleteAllSessionsForUser(userId) {
  const sessions = await prisma.session.findMany({
    where: { userId },
    select: { id: true },
  });

  await revokeDisplaysForSessionIds(sessions.map((session) => session.id));
  await prisma.session.deleteMany({ where: { userId } });
}

async function getSessionFromToken(token) {
  if (!token) return null;
  await cleanupExpiredSessions();

  const now = new Date();
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: sessionUserSelect,
      },
    },
  });

  const absoluteDeadline = session ? new Date(session.createdAt.getTime() + env.SESSION_ABSOLUTE_TIMEOUT_MS) : null;

  if (
    !session ||
    session.expiresAt <= now ||
    (absoluteDeadline && absoluteDeadline <= now) ||
    !session.user.isActive ||
    (session.user.storeId && (!session.user.store || !session.user.store.isActive))
  ) {
    await deleteSession(token).catch(() => undefined);
    return null;
  }

  return session;
}

async function touchSession(session) {
  const now = new Date();
  const remainingMs = session.expiresAt.getTime() - now.getTime();

  // Only refresh the idle timeout when the session is getting close to expiry.
  if (remainingMs > SESSION_REFRESH_THRESHOLD_MS) {
    return session;
  }

  const nextExpiresAt = calculateSessionExpiry(now, session.createdAt);

  if (nextExpiresAt <= session.expiresAt) {
    return session;
  }

  const updated = await prisma.session.update({
    where: { id: session.id },
    data: { expiresAt: nextExpiresAt },
    include: {
      user: {
        select: sessionUserSelect,
      },
    },
  });

  return updated;
}

function setSessionCookie(res, token, expiresAt) {
  res.cookie(env.SESSION_COOKIE_NAME, token, cookieOptions(expiresAt));
}

function clearSessionCookie(res) {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

module.exports = {
  cleanupExpiredSessions,
  createSession,
  deleteSession,
  deleteAllSessionsForUser,
  getSessionFromToken,
  touchSession,
  setSessionCookie,
  clearSessionCookie,
};
