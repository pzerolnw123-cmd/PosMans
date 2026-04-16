const path = require("node:path");
const crypto = require("node:crypto");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const { env } = require("../config/env");
const { AppError } = require("../utils/app-error");

const allowedMimeTypes = new Map([
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/png", ["png"]],
  ["image/webp", ["webp"]],
  ["application/pdf", ["pdf"]],
]);

function isR2Configured() {
  return Boolean(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_ENDPOINT);
}

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
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

async function createPresignedUpload({ fileName, contentType, contentLength }) {
  const validated = validateUploadRequest({ fileName, contentType, contentLength });
  const objectKey = `uploads/${crypto.randomUUID()}.${validated.extension}`;

  const post = await createPresignedPost(getR2Client(), {
    Bucket: env.R2_BUCKET,
    Key: objectKey,
    Conditions: [
      ["eq", "$Content-Type", validated.contentType],
      ["content-length-range", 1, env.MAX_UPLOAD_BYTES],
      ["starts-with", "$key", "uploads/"],
    ],
    Fields: {
      key: objectKey,
      "Content-Type": validated.contentType,
    },
    Expires: 60,
  });

  return {
    objectKey,
    upload: post,
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    publicUrl: env.R2_PUBLIC_BASE_URL ? `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${objectKey}` : null,
  };
}

module.exports = { isR2Configured, createPresignedUpload, validateUploadRequest };