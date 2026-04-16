const crypto = require("node:crypto");
const { env } = require("../config/env");

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

function issueCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function setCsrfCookie(res, token) {
  res.cookie(env.CSRF_COOKIE_NAME, token, csrfCookieOptions());
}

function clearCsrfCookie(res) {
  res.clearCookie(env.CSRF_COOKIE_NAME, csrfCookieOptions());
}

function readCsrfFromRequest(req) {
  return {
    cookieToken: req.cookies?.[env.CSRF_COOKIE_NAME],
    headerToken: req.get("x-csrf-token"),
  };
}

module.exports = {
  issueCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  readCsrfFromRequest,
};