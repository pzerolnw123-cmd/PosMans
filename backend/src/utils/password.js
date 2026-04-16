const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;
const usernamePattern = /^[a-z0-9._-]{3,32}$/;
const pinPattern = /^\d{6}$/;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidUsername(value) {
  return usernamePattern.test(value);
}

function isValidPin(value) {
  return pinPattern.test(value);
}

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

async function hashPin(pin) {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

async function verifyPin(pin, pinHash) {
  return bcrypt.compare(pin, pinHash);
}

module.exports = {
  normalizeUsername,
  isValidUsername,
  isValidPin,
  hashPassword,
  verifyPassword,
  hashPin,
  verifyPin,
};
