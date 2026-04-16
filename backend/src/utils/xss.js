const sanitizeHtml = require("sanitize-html");
const { z } = require("zod");
const { AppError } = require("./app-error");

const suspiciousHtmlPattern = /<\s*\/??\s*[a-z!]|javascript:|vbscript:|data:text\/html/i;
const safeUrlProtocolPattern = /^(https?:\/\/)/i;

function assertSafePlainText(value, fieldName = "value") {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a string`, 400, { code: "BAD_TEXT_TYPE" });
  }

  if (suspiciousHtmlPattern.test(value)) {
    throw new AppError(`${fieldName} contains disallowed markup`, 400, { code: "UNSAFE_TEXT" });
  }

  return value;
}

function assertSafeHttpUrl(value, fieldName = "url") {
  if (typeof value !== "string") {
    throw new AppError(`${fieldName} must be a string`, 400, { code: "BAD_URL_TYPE" });
  }

  if (!safeUrlProtocolPattern.test(value)) {
    throw new AppError(`${fieldName} must use http or https`, 400, { code: "UNSAFE_URL" });
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError(`${fieldName} is not a valid URL`, 400, { code: "BAD_URL" });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError(`${fieldName} must use http or https`, 400, { code: "UNSAFE_URL" });
  }

  return parsed.toString();
}

function sanitizeRichText(value) {
  if (typeof value !== "string") {
    throw new AppError("rich text must be a string", 400, { code: "BAD_RICH_TEXT_TYPE" });
  }

  return sanitizeHtml(value, {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

const safeTextSchema = (fieldName, maxLength = 160) =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .transform((value) => assertSafePlainText(value, fieldName));

const safeUrlSchema = (fieldName) => z.string().transform((value) => assertSafeHttpUrl(value, fieldName));

module.exports = {
  assertSafePlainText,
  assertSafeHttpUrl,
  sanitizeRichText,
  safeTextSchema,
  safeUrlSchema,
};