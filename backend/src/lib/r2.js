const path = require("node:path");
const crypto = require("node:crypto");
const { PutObjectCommand, DeleteObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");

const allowedMimeTypes = new Map([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
  ["application/pdf", ["pdf"]],
]);

let r2Client = null;

function isR2Configured() {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_ENDPOINT);
}

function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

function validateUploadRequest({ fileName, contentType, contentLength }) {
  const normalizedContentType = contentType.toLowerCase();
  const extension = path.extname(fileName).replace(".", "").toLowerCase();
  const allowedExtensions = allowedMimeTypes.get(normalizedContentType);

  if (!allowedExtensions) {
    throw new AppError("Unsupported file type", 400, { code: "BAD_FILE_TYPE" });
  }

  if (!allowedExtensions.includes(extension)) {
    throw new AppError("File extension does not match content type", 400, { code: "BAD_FILE_EXTENSION" });
  }

  if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > env.MAX_UPLOAD_BYTES) {
    throw new AppError("Invalid file size", 400, { code: "BAD_FILE_SIZE" });
  }

  return {
    extension,
    contentType: normalizedContentType,
    contentLength,
  };
}

function normalizeObjectPrefix(prefix) {
  if (!prefix) {
    return "uploads";
  }

  return prefix
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

async function createPresignedUpload({ fileName, contentType, contentLength }, { prefix } = {}) {
  const validated = validateUploadRequest({ fileName, contentType, contentLength });
  const objectPrefix = normalizeObjectPrefix(prefix);
  const objectKey = `${objectPrefix}/${crypto.randomUUID()}.${validated.extension}`;
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: objectKey,
    ContentType: validated.contentType,
  });
  const putUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 60 });

  return {
    objectKey,
    upload: {
      method: "PUT",
      url: putUrl,
      headers: {
        "Content-Type": validated.contentType,
      },
    },
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    publicUrl: env.R2_PUBLIC_BASE_URL ? `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey}` : null,
  };
}

async function deleteR2Object(objectKey) {
  if (!objectKey || !isR2Configured()) {
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: objectKey,
    });
    await getR2Client().send(command);
  } catch (error) {
    // Log error but don't fail the request - orphan files are less critical than broken business logic
    console.error(`[R2] Failed to delete object ${objectKey}:`, error);
  }
}

module.exports = { 
  isR2Configured, 
  createPresignedUpload, 
  validateUploadRequest,
  normalizeObjectPrefix,
  deleteR2Object,
};
