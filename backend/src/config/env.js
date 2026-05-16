const { z } = require("zod");

const defaults = {
  PORT: "4000",
  FRONTEND_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  DIRECT_DATABASE_URL: "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  SESSION_SECRET: "replace-this-development-session-secret-with-32-chars",
  SESSION_COOKIE_NAME: "pos_mans_session",
  TRUST_PROXY: "false",
  MAX_UPLOAD_BYTES: "5242880",
  SESSION_IDLE_TIMEOUT_MINUTES: "60",
  SESSION_ABSOLUTE_TIMEOUT_HOURS: "12",
  MAX_SALE_DISCOUNT_BPS: "10000",
  MAX_SALE_TAX_BPS: "10000",
  SALE_RATE_LIMIT_WINDOW_MS: "60000",
  SALE_RATE_LIMIT_MAX: "60",
  UPLOAD_RATE_LIMIT_WINDOW_MS: "900000",
  UPLOAD_RATE_LIMIT_MAX: "30",
  AUDIT_LOG_RETENTION_DAYS: "365",
  DB_POOL_MAX: "10",
  DB_CONNECTION_TIMEOUT_MS: "5000",
  DB_IDLE_TIMEOUT_MS: "30000",
  DB_QUERY_TIMEOUT_MS: "10000",
  DB_STATEMENT_TIMEOUT_MS: "10000",
  DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS: "15000",
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive(),
  FRONTEND_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(3),
  TRUST_PROXY: z.union([z.boolean(), z.string()]).transform((value) => value === true || value === "true"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().max(24 * 60),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: z.coerce.number().int().positive().max(24 * 7),
  MAX_SALE_DISCOUNT_BPS: z.coerce.number().int().min(0).max(10000),
  MAX_SALE_TAX_BPS: z.coerce.number().int().min(0).max(10000),
  SALE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(60 * 60 * 1000),
  SALE_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(1000),
  UPLOAD_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(60 * 60 * 1000),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().max(1000),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().max(3650),
  DB_POOL_MAX: z.coerce.number().int().positive().max(50),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().max(60 * 1000),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().max(10 * 60 * 1000),
  DB_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().max(60 * 1000),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().max(60 * 1000),
  DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS: z.coerce.number().int().positive().max(60 * 1000),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.url().optional(),
  R2_ENDPOINT: z.url().optional(),
}).superRefine((value, ctx) => {
  if (value.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 < value.SESSION_IDLE_TIMEOUT_MINUTES) {
    ctx.addIssue({
      code: "custom",
      path: ["SESSION_ABSOLUTE_TIMEOUT_HOURS"],
      message: "absolute session timeout must be greater than or equal to idle timeout",
    });
  }

  const r2Fields = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_ENDPOINT"];
  const hasAnyR2Config = r2Fields.some((field) => Boolean(value[field]));
  if (hasAnyR2Config) {
    for (const field of r2Fields) {
      if (!value[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: "R2 upload configuration must be complete when any R2 credential is set",
        });
      }
    }
  }

  if (value.R2_ENDPOINT && new URL(value.R2_ENDPOINT).protocol !== "https:") {
    ctx.addIssue({
      code: "custom",
      path: ["R2_ENDPOINT"],
      message: "R2_ENDPOINT must use https",
    });
  }

  if (value.R2_PUBLIC_BASE_URL && new URL(value.R2_PUBLIC_BASE_URL).protocol !== "https:") {
    ctx.addIssue({
      code: "custom",
      path: ["R2_PUBLIC_BASE_URL"],
      message: "R2_PUBLIC_BASE_URL must use https",
    });
  }
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || defaults.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL || defaults.FRONTEND_URL,
  DATABASE_URL: process.env.DATABASE_URL || defaults.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL || defaults.DIRECT_DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET || defaults.SESSION_SECRET,
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || defaults.SESSION_COOKIE_NAME,
  TRUST_PROXY: process.env.TRUST_PROXY || defaults.TRUST_PROXY,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES || defaults.MAX_UPLOAD_BYTES,
  SESSION_IDLE_TIMEOUT_MINUTES: process.env.SESSION_IDLE_TIMEOUT_MINUTES || defaults.SESSION_IDLE_TIMEOUT_MINUTES,
  SESSION_ABSOLUTE_TIMEOUT_HOURS: process.env.SESSION_ABSOLUTE_TIMEOUT_HOURS || defaults.SESSION_ABSOLUTE_TIMEOUT_HOURS,
  MAX_SALE_DISCOUNT_BPS: process.env.MAX_SALE_DISCOUNT_BPS || defaults.MAX_SALE_DISCOUNT_BPS,
  MAX_SALE_TAX_BPS: process.env.MAX_SALE_TAX_BPS || defaults.MAX_SALE_TAX_BPS,
  SALE_RATE_LIMIT_WINDOW_MS: process.env.SALE_RATE_LIMIT_WINDOW_MS || defaults.SALE_RATE_LIMIT_WINDOW_MS,
  SALE_RATE_LIMIT_MAX: process.env.SALE_RATE_LIMIT_MAX || defaults.SALE_RATE_LIMIT_MAX,
  UPLOAD_RATE_LIMIT_WINDOW_MS: process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || defaults.UPLOAD_RATE_LIMIT_WINDOW_MS,
  UPLOAD_RATE_LIMIT_MAX: process.env.UPLOAD_RATE_LIMIT_MAX || defaults.UPLOAD_RATE_LIMIT_MAX,
  AUDIT_LOG_RETENTION_DAYS: process.env.AUDIT_LOG_RETENTION_DAYS || defaults.AUDIT_LOG_RETENTION_DAYS,
  DB_POOL_MAX: process.env.DB_POOL_MAX || defaults.DB_POOL_MAX,
  DB_CONNECTION_TIMEOUT_MS: process.env.DB_CONNECTION_TIMEOUT_MS || defaults.DB_CONNECTION_TIMEOUT_MS,
  DB_IDLE_TIMEOUT_MS: process.env.DB_IDLE_TIMEOUT_MS || defaults.DB_IDLE_TIMEOUT_MS,
  DB_QUERY_TIMEOUT_MS: process.env.DB_QUERY_TIMEOUT_MS || defaults.DB_QUERY_TIMEOUT_MS,
  DB_STATEMENT_TIMEOUT_MS: process.env.DB_STATEMENT_TIMEOUT_MS || defaults.DB_STATEMENT_TIMEOUT_MS,
  DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS:
    process.env.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS || defaults.DB_IDLE_IN_TRANSACTION_SESSION_TIMEOUT_MS,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET: process.env.R2_BUCKET,
  R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
});

if (parsed.NODE_ENV === "production" && parsed.SESSION_SECRET === defaults.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be overridden in production");
}

if (parsed.NODE_ENV === "production" && new URL(parsed.FRONTEND_URL).protocol !== "https:") {
  throw new Error("FRONTEND_URL must use HTTPS in production");
}

if (
  parsed.NODE_ENV === "production" &&
  (parsed.DATABASE_URL === defaults.DATABASE_URL || parsed.DIRECT_DATABASE_URL === defaults.DIRECT_DATABASE_URL)
) {
  throw new Error("DATABASE_URL and DIRECT_DATABASE_URL must be configured in production");
}

if (parsed.NODE_ENV === "production" && parsed.R2_ACCESS_KEY_ID && !parsed.R2_PUBLIC_BASE_URL) {
  throw new Error("R2_PUBLIC_BASE_URL must be configured in production when R2 uploads are enabled");
}

if (parsed.NODE_ENV !== "test" && parsed.SESSION_SECRET === defaults.SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be configured outside test environments");
}

module.exports = {
  env: {
    ...parsed,
    SESSION_HASH_SECRET: parsed.SESSION_SECRET,
    CSRF_COOKIE_NAME: `${parsed.SESSION_COOKIE_NAME}_csrf`,
    SESSION_IDLE_TIMEOUT_MS: parsed.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000,
    SESSION_ABSOLUTE_TIMEOUT_MS: parsed.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000,
  },
};
