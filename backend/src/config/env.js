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
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 < value.SESSION_IDLE_TIMEOUT_MINUTES) {
    ctx.addIssue({
      code: "custom",
      path: ["SESSION_ABSOLUTE_TIMEOUT_HOURS"],
      message: "absolute session timeout must be greater than or equal to idle timeout",
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

module.exports = {
  env: {
    ...parsed,
    SESSION_HASH_SECRET: parsed.SESSION_SECRET,
    CSRF_COOKIE_NAME: `${parsed.SESSION_COOKIE_NAME}_csrf`,
    SESSION_IDLE_TIMEOUT_MS: parsed.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000,
    SESSION_ABSOLUTE_TIMEOUT_MS: parsed.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60 * 60 * 1000,
  },
};
