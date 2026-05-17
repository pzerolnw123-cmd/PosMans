const { ZodError } = require("zod");
const { AppError } = require("../utils/app-error");

const sensitiveQueryParams = new Set(["token", "controlToken", "csrfToken", "password", "pin"]);

function sanitizeRequestPathForLog(req) {
  const rawPath = req.originalUrl || req.url || "";
  try {
    const url = new URL(rawPath, "http://internal.local");
    for (const param of sensitiveQueryParams) {
      if (url.searchParams.has(param)) {
        url.searchParams.set(param, "redacted");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    const queryStart = rawPath.indexOf("?");
    return queryStart === -1 ? rawPath : rawPath.slice(0, queryStart);
  }
}

function sanitizeErrorMessageForLog(message) {
  return String(message || "")
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://***:***@")
    .replace(/([?&](?:password|token|pin|key|secret)=)[^&\s]+/gi, "$1redacted")
    .slice(0, 240);
}

function isDatabaseTimeoutError(err) {
  const code = String(err?.code || "");
  const message = String(err?.message || "");
  return (
    code === "57014" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    /timeout|timed out|statement timeout|Connection terminated|terminating connection/i.test(message)
  );
}

function isDatabaseUnavailableError(err) {
  const code = String(err?.code || "");
  const message = String(err?.message || "");
  return (
    code === "53300" ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    /too many clients|remaining connection slots|database.*unavailable|pool.*ended/i.test(message)
  );
}

function logHandledError(err, statusCode, req) {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (process.env.NODE_ENV === "production") {
    const isDatabaseError = isDatabaseTimeoutError(err) || isDatabaseUnavailableError(err);
    const payload = {
      name: err.constructor.name,
      statusCode,
      code: err instanceof AppError ? err.code : undefined,
      method: req.method,
      path: sanitizeRequestPathForLog(req),
    };

    if (isDatabaseError) {
      payload.driverCode = err?.code;
      payload.message = sanitizeErrorMessageForLog(err?.message);
    }

    console.error("[errorHandler] Request failed", payload);
    return;
  }

  console.error("[errorHandler] Error:", err.constructor.name, err.message, {
    method: req.method,
    path: sanitizeRequestPathForLog(req),
  });
  if (err instanceof ZodError) {
    console.error("[errorHandler] ZodError details:", JSON.stringify(err.issues));
  }
}

function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    logHandledError(err, 400, req);
    return res.status(400).json({
      error: "ข้อมูลที่ส่งมาไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง",
    });
  }

  if (err instanceof AppError) {
    logHandledError(err, err.statusCode, req);
    const payload = {
      error: err.expose ? err.message : "ไม่สามารถดำเนินการตามคำขอได้",
    };

    if (err.code === "CSRF_MISMATCH" || err.code === "PLAN_LIMIT_REACHED") {
      payload.code = err.code;
    }

    if (err.code === "PLAN_LIMIT_REACHED" && err.details) {
      payload.details = err.details;
    }

    return res.status(err.statusCode).json(payload);
  }

  if (isDatabaseTimeoutError(err) || isDatabaseUnavailableError(err)) {
    const code = isDatabaseTimeoutError(err) ? "DB_TIMEOUT" : "DB_UNAVAILABLE";
    logHandledError(err, 503, req);
    return res.status(503).json({
      error: "Database is temporarily unavailable. Please try again.",
      code,
    });
  }

  const statusCode = err.statusCode || 500;
  logHandledError(err, statusCode, req);

  return res.status(statusCode).json({
    error: statusCode >= 500 ? "ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองอีกครั้ง" : "ไม่สามารถดำเนินการตามคำขอได้",
  });
}

module.exports = {
  errorHandler,
  sanitizeErrorMessageForLog,
  sanitizeRequestPathForLog,
  isDatabaseTimeoutError,
  isDatabaseUnavailableError,
};
