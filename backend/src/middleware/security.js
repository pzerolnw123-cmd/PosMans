const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");
const { readCsrfFromRequest } = require("../utils/csrf");

function requireTrustedOrigin(req, _res, next) {
  const origin = req.get("origin");
  const referer = req.get("referer");
  const trustedOrigin = new URL(env.FRONTEND_URL).origin;

  if (origin && origin === trustedOrigin) {
    return next();
  }

  if (referer) {
    try {
      if (new URL(referer).origin === trustedOrigin) {
        return next();
      }
    } catch {
      throw new AppError("Invalid request origin", 403, { code: "BAD_ORIGIN" });
    }
  }

  return next(new AppError("Invalid request origin", 403, { code: "BAD_ORIGIN" }));
}

function requireCsrf(req, _res, next) {
  const { cookieToken, headerToken } = readCsrfFromRequest(req);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError("CSRF token mismatch", 403, { code: "CSRF_MISMATCH" }));
  }

  return next();
}

module.exports = { requireTrustedOrigin, requireCsrf };