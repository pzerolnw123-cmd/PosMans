const { AppError } = require("./app-error");
const { allowlist, englishCompactWords, englishExactWords, thaiBlockedTerms } = require("../config/profanity");

const combiningMarkPattern = /[\u0300-\u036f]/g;
const thaiToneMarkPattern = /[\u0E47-\u0E4E]/g;
const separatorPattern = /[\s._\-*~|/\\()[\]{}'"`!@#$%^&+=:;,<>?]+/g;
const nonWordBoundaryPattern = /[^a-z0-9]+/g;
const leetMap = new Map([
  ["0", "o"],
  ["1", "i"],
  ["3", "e"],
  ["4", "a"],
  ["5", "s"],
  ["7", "t"],
  ["@", "a"],
  ["$", "s"],
]);

function normalizeBase(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(combiningMarkPattern, "")
    .normalize("NFC")
    .replace(thaiToneMarkPattern, "");
}

function applyLeetMap(value) {
  return Array.from(value, (char) => leetMap.get(char) || char).join("");
}

function normalizeForWords(value) {
  return applyLeetMap(normalizeBase(value))
    .replace(nonWordBoundaryPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(value) {
  return applyLeetMap(normalizeBase(value)).replace(separatorPattern, "");
}

function stripAllowedText(value) {
  return allowlist.reduce((current, allowed) => {
    const normalizedAllowed = normalizeCompact(allowed);
    return current.split(normalizedAllowed).join("");
  }, value);
}

function containsEnglishExactWord(normalizedWords) {
  if (!normalizedWords) {
    return false;
  }

  const padded = ` ${normalizedWords} `;
  return englishExactWords.some((term) => padded.includes(` ${term} `));
}

function containsCompactTerm(normalizedCompact) {
  const withoutAllowed = stripAllowedText(normalizedCompact);
  return englishCompactWords.some((term) => withoutAllowed.includes(term));
}

function containsThaiTerm(normalizedCompact) {
  const withoutAllowed = stripAllowedText(normalizedCompact);
  return thaiBlockedTerms.some((term) => withoutAllowed.includes(normalizeCompact(term)));
}

function hasProfanity(value) {
  const normalizedWords = normalizeForWords(value);
  const normalizedCompact = normalizeCompact(value);

  return containsEnglishExactWord(normalizedWords) || containsCompactTerm(normalizedCompact) || containsThaiTerm(normalizedCompact);
}

function assertNoProfanity(value, fieldName = "value") {
  if (typeof value !== "string" || !hasProfanity(value)) {
    return value;
  }

  throw new AppError("ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนบันทึก", 400, {
    code: "INAPPROPRIATE_LANGUAGE",
    details: { fieldName },
  });
}

module.exports = {
  assertNoProfanity,
  hasProfanity,
  normalizeCompact,
  normalizeForWords,
};
