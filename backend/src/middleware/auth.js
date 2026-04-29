const { getSessionFromToken, setSessionCookie, touchSession } = require("../utils/session");
const { env } = require("../config/env");

async function loadSession(req, res) {
  if (req.session) {
    return req.session;
  }

  const token = req.cookies?.[env.SESSION_COOKIE_NAME];
  const session = await getSessionFromToken(token);

  if (!session) {
    req.session = null;
    return null;
  }

  const refreshedSession = await touchSession(session);
  if (refreshedSession.expiresAt > session.expiresAt && res) {
    setSessionCookie(res, token, refreshedSession.expiresAt);
  }

  req.session = refreshedSession;
  return refreshedSession;
}

async function requireAuth(req, res, next) {
  const session = await loadSession(req, res);

  if (!session) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" });
  }

  next();
}

function requirePlatformRole(roles) {
  return async (req, res, next) => {
    const session = await loadSession(req, res);

    if (!session || !roles.includes(session.user.platformRole)) {
      return res.status(403).json({ error: "ไม่สามารถดำเนินการได้ด้วยสิทธิ์ปัจจุบัน" });
    }

    next();
  };
}

function requireStoreRole(roles) {
  return async (req, res, next) => {
    const session = await loadSession(req, res);

    if (!session || !session.user.storeId || !session.user.storeRole || !roles.includes(session.user.storeRole)) {
      return res.status(403).json({ error: "ไม่สามารถดำเนินการได้ด้วยสิทธิ์ปัจจุบัน" });
    }

    next();
  };
}

function requireAccess({ platformRoles = [], storeRoles = [] }) {
  return async (req, res, next) => {
    const session = await loadSession(req, res);

    if (!session) {
      return res.status(401).json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" });
    }

    const allowedByPlatform = platformRoles.includes(session.user.platformRole);
    const allowedByStore =
      Boolean(session.user.storeId) && Boolean(session.user.storeRole) && storeRoles.includes(session.user.storeRole);

    if (!allowedByPlatform && !allowedByStore) {
      return res.status(403).json({ error: "ไม่สามารถดำเนินการได้ด้วยสิทธิ์ปัจจุบัน" });
    }

    next();
  };
}

module.exports = { requireAuth, requirePlatformRole, requireStoreRole, requireAccess, loadSession };
