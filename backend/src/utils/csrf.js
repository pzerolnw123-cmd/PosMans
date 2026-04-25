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

function signCsrfSecret(secret) {
  return crypto.createHmac("sha256", env.SESSION_HASH_SECRET).update(secret).digest("hex");
}

function issueCsrfToken() {
  const secret = crypto.randomBytes(24).toString("hex");
  return `${secret}.${signCsrfSecret(secret)}`;
}

function isValidCsrfToken(token) {
  if (typeof token !== "string") {
    return false;
  }

  const [secret, signature, extra] = token.split(".");
  if (!/^[0-9a-f]{48}$/i.test(secret) || !/^[0-9a-f]{64}$/i.test(signature) || extra) {
    return false;
  }

  const expected = signCsrfSecret(secret);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
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
  isValidCsrfToken,
  setCsrfCookie,
  clearCsrfCookie,
  readCsrfFromRequest,
};
