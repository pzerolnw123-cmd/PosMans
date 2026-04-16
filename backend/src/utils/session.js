const crypto = require("node:crypto");
const { prisma } = require("../lib/db");
const { env } = require("../config/env");

function hashToken(value) {
  return crypto.createHmac("sha256", env.SESSION_HASH_SECRET).update(value).digest("hex");
}

const sessionUserSelect = {
  id: true,
  username: true,
  displayName: true,
  platformRole: true,
  storeRole: true,
  storeId: true,
  isActive: true,
  store: {
    select: {
      id: true,
      name: true,
      slug: true,
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
  await prisma.session.deleteMany({ where: { expiresAt: { lte: new Date() } } });
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
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

async function deleteAllSessionsForUser(userId) {
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
