import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredPathFragments = ["node_modules/", ".next/", ".git/", "skills-main/", "coverage/", "dist/", "build/", "generated/"];
const ignoredFileNames = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const ignoredExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".pdf",
  ".zip",
  ".gz",
  ".sqlite",
  ".db",
]);

const safeValuePattern =
  /^(|""|''|<[^>]+>|false|true|replace[-_\w]*|placeholder|example|demo|changeme|change-me|your[-_\w]*|test|dev|null|undefined)$/i;
const safeSecretKeyPattern =
  /(PUBLIC|EXAMPLE|PLACEHOLDER|DUMMY|TEST|DEMO|E2E|PLAYWRIGHT|NEXT_PUBLIC)/i;
const sensitiveAssignmentPattern =
  /^\s*(?:export\s+)?([A-Z0-9_]*(?:SECRET|PASSWORD|PASS|TOKEN|PRIVATE_KEY|ACCESS_KEY|API_KEY|DATABASE_URL|DIRECT_DATABASE_URL|R2_[A-Z0-9_]+)[A-Z0-9_]*)\s*=\s*["']?([^"',\s#]+)["']?/;
const privateKeyPattern = /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/;
const cloudAccessKeyPattern = /\b(?:AKIA|ASIA|A3T|AGPA|AIDA)[A-Z0-9]{16}\b/;
const longBearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}\b/i;

function normalizeFilePath(filePath) {
  return filePath.replaceAll("\\", "/");
}

function isIgnored(filePath) {
  const normalized = normalizeFilePath(filePath);
  if (ignoredPathFragments.some((fragment) => normalized.includes(fragment))) {
    return true;
  }

  const fileName = path.basename(normalized);
  if (ignoredFileNames.has(fileName)) {
    return true;
  }

  if (/^\.env(?:\.|$)/.test(fileName) && fileName !== ".env.example") {
    return true;
  }

  return ignoredExtensions.has(path.extname(normalized).toLowerCase());
}

function isSafePlaceholder(key, value) {
  const cleaned = String(value || "").trim();
  if (safeValuePattern.test(cleaned)) {
    return true;
  }

  if (cleaned.includes("<") || cleaned.includes(">") || cleaned.includes("USER:PASSWORD@HOST")) {
    return true;
  }

  if (safeSecretKeyPattern.test(key) && cleaned.length <= 80) {
    return true;
  }

  return false;
}

function listScannableFiles(directory = root) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = normalizeFilePath(path.relative(root, fullPath));
    if (!relativePath || isIgnored(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...listScannableFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      const stat = statSync(fullPath);
      if (stat.size <= 1024 * 1024) {
        files.push(relativePath);
      }
    }
  }
  return files;
}

const findings = [];

for (const filePath of listScannableFiles()) {
  let content = "";
  try {
    content = readFileSync(path.join(root, filePath), "utf8");
  } catch {
    continue;
  }

  content.split(/\r?\n/).forEach((line, index) => {
    const lineNo = index + 1;
    const assignmentMatch = line.match(sensitiveAssignmentPattern);
    if (assignmentMatch && !isSafePlaceholder(assignmentMatch[1], assignmentMatch[2])) {
      findings.push({
        filePath,
        lineNo,
        reason: `sensitive-looking assignment '${assignmentMatch[1]}'`,
      });
    }

    if (privateKeyPattern.test(line)) {
      findings.push({ filePath, lineNo, reason: "private key material" });
    }

    if (cloudAccessKeyPattern.test(line)) {
      findings.push({ filePath, lineNo, reason: "cloud access key pattern" });
    }

    if (longBearerPattern.test(line)) {
      findings.push({ filePath, lineNo, reason: "bearer token pattern" });
    }
  });
}

if (findings.length > 0) {
  console.error("Secret scan failed. Review these tracked files:");
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.lineNo} (${finding.reason})`);
  }
  process.exit(1);
}

console.log("Secret scan passed. No high-confidence secrets found in tracked files.");
