import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");
const backendEnvPath = path.join(root, "backend", ".env");
const frontendEnvPath = path.join(root, "frontend", ".env");
const defaultSessionSecret = "replace-this-development-session-secret-with-32-chars";

function parseDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const backendEnv = { ...parseDotEnv(backendEnvPath), ...process.env };
const frontendEnv = { ...parseDotEnv(frontendEnvPath), ...process.env };

const checks = [];

function addCheck(status, name, detail) {
  checks.push({ status, name, detail });
}

function isLocalUrl(rawValue) {
  try {
    const url = new URL(rawValue);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isHttpsOrLocal(rawValue) {
  try {
    const url = new URL(rawValue);
    return url.protocol === "https:" || isLocalUrl(rawValue);
  } catch {
    return false;
  }
}

function isPlaceholder(value) {
  return !value || /placeholder|replace|example|demo|changeme|change-me/i.test(value);
}

function requireHttpsOrLocal(name, value) {
  if (!value) {
    addCheck("warn", name, "not set in local environment; required for production deployment");
    return;
  }

  addCheck(isHttpsOrLocal(value) ? "pass" : "fail", name, "must be HTTPS for real production domains");
}

requireHttpsOrLocal("FRONTEND_URL", backendEnv.FRONTEND_URL);
requireHttpsOrLocal("BACKEND_URL", frontendEnv.BACKEND_URL);

if (!backendEnv.SESSION_SECRET || backendEnv.SESSION_SECRET.length < 32 || backendEnv.SESSION_SECRET === defaultSessionSecret || isPlaceholder(backendEnv.SESSION_SECRET)) {
  addCheck("fail", "SESSION_SECRET", "must be unique, non-example, and at least 32 random characters");
} else {
  addCheck("pass", "SESSION_SECRET", "configured with non-example length");
}

for (const name of ["DATABASE_URL", "DIRECT_DATABASE_URL"]) {
  const value = backendEnv[name];
  if (!value || value.includes("placeholder") || value.includes("USER:PASSWORD@HOST")) {
    addCheck("fail", name, "must point to the production database");
    continue;
  }

  if (/^postgres/i.test(value) && !/sslmode=(require|verify-full)/i.test(value) && !isLocalUrl(value.replace(/^postgresql?:/, "http:"))) {
    addCheck("warn", name, "consider sslmode=require or sslmode=verify-full for production Postgres");
    continue;
  }

  addCheck("pass", name, "configured");
}

const r2Required = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_ENDPOINT", "R2_PUBLIC_BASE_URL"];
const r2Values = r2Required.map((name) => backendEnv[name]);
const hasAnyR2 = r2Values.some(Boolean);
if (!hasAnyR2) {
  addCheck("warn", "R2 upload config", "not configured; uploads will not be production-ready");
} else {
  for (const name of r2Required) {
    addCheck(backendEnv[name] ? "pass" : "fail", name, "required when R2 uploads are enabled");
  }
  requireHttpsOrLocal("R2_ENDPOINT", backendEnv.R2_ENDPOINT);
  requireHttpsOrLocal("R2_PUBLIC_BASE_URL", backendEnv.R2_PUBLIC_BASE_URL);
}

for (const [name, defaultValue] of [
  ["SALE_RATE_LIMIT_MAX", "60"],
  ["UPLOAD_RATE_LIMIT_MAX", "30"],
  ["AUDIT_LOG_RETENTION_DAYS", "365"],
  ["DB_POOL_MAX", "10"],
  ["DB_CONNECTION_TIMEOUT_MS", "5000"],
  ["DB_QUERY_TIMEOUT_MS", "10000"],
  ["DB_STATEMENT_TIMEOUT_MS", "10000"],
]) {
  addCheck(Number(backendEnv[name] || defaultValue) > 0 ? "pass" : "fail", name, "must be a positive number");
}

const codeChecks = [
  {
    name: "Secure session cookie flags",
    file: "backend/src/utils/session.js",
    patterns: ["httpOnly: true", "secure: env.NODE_ENV === \"production\"", "sameSite: \"lax\""],
  },
  {
    name: "CSRF cookie flags",
    file: "backend/src/utils/csrf.js",
    patterns: ["secure: env.NODE_ENV === \"production\"", "sameSite: \"lax\""],
  },
  {
    name: "Frontend CSP frame/object restrictions",
    file: "frontend/next.config.ts",
    patterns: ["object-src 'none'", "frame-ancestors 'none'", "frame-src 'none'"],
  },
];

for (const check of codeChecks) {
  const content = readFileSync(path.join(root, check.file), "utf8");
  const missing = check.patterns.filter((pattern) => !content.includes(pattern));
  addCheck(missing.length === 0 ? "pass" : "fail", check.name, missing.length ? `missing: ${missing.join(", ")}` : "present in code");
}

const operationalAcknowledgements = [
  ["HTTPS_CERTIFICATE_CONFIRMED", "HTTPS certificate and production domain have been validated"],
  ["R2_BUCKET_POLICY_CONFIRMED", "Cloudflare R2 bucket blocks public writes and only allows intended public reads"],
  ["DATABASE_BACKUP_CONFIRMED", "database backups and restore test are configured"],
  ["MONITORING_ALERTS_CONFIRMED", "monitoring/alerts cover login spikes, upload spikes, checkout errors, 5xx, and DB errors"],
  ["SECRET_MANAGER_CONFIRMED", "production secrets are stored in a deployment secret manager or protected env provider"],
];

for (const [name, detail] of operationalAcknowledgements) {
  addCheck(backendEnv[name] === "true" || frontendEnv[name] === "true" ? "pass" : "warn", name, detail);
}

const icon = {
  pass: "PASS",
  warn: "WARN",
  fail: "FAIL",
};

let failures = 0;
let warnings = 0;
console.log("Production readiness report");
for (const check of checks) {
  if (check.status === "fail") failures += 1;
  if (check.status === "warn") warnings += 1;
  console.log(`[${icon[check.status]}] ${check.name}: ${check.detail}`);
}

if (failures > 0 || (strict && warnings > 0)) {
  console.error(`Production readiness incomplete: ${failures} failure(s), ${warnings} warning(s).`);
  process.exit(1);
}

console.log(`Production readiness checks passed with ${warnings} warning(s).`);
