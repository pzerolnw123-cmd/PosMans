const crypto = require("node:crypto");
const { env } = require("../config/env");

const algorithm = "aes-256-gcm";
const version = "v1";

function encryptionKey() {
  return crypto.createHash("sha256").update(`pos-mans-secret-box:${env.SESSION_HASH_SECRET}`).digest();
}

function encryptSecret(value) {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [version, iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptSecret(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const [storedVersion, ivText, authTagText, ciphertextText, extra] = value.split(".");
  if (storedVersion !== version || !ivText || !authTagText || !ciphertextText || extra) {
    return null;
  }

  const decipher = crypto.createDecipheriv(algorithm, encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
}

function secretHint(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const compact = value.replace(/\s+/g, "");
  if (compact.length <= 8) {
    return "••••";
  }

  return `••••${compact.slice(-4)}`;
}

module.exports = { decryptSecret, encryptSecret, secretHint };
