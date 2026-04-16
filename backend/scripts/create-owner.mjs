import "dotenv/config";
import { PlatformRole, PrismaClient, StoreRole } from "@prisma/client";
import passwordUtils from "../src/utils/password.js";

const prisma = new PrismaClient();
const { hashPassword, hashPin, isValidPin, isValidUsername, normalizeUsername } = passwordUtils;

const storeSlug = process.argv[2] || process.env.STORE_OWNER_STORE_SLUG;
const storeName = process.argv[3] || process.env.STORE_OWNER_STORE_NAME;
const username = process.argv[4] || process.env.STORE_OWNER_USERNAME;
const password = process.argv[5] || process.env.STORE_OWNER_PASSWORD;
const pin = process.argv[6] || process.env.STORE_OWNER_PIN;
const displayName = process.argv[7] || process.env.STORE_OWNER_DISPLAY_NAME || "Store Owner";

if (!storeSlug || !storeName || !username || !password) {
  console.error("Usage: npm run create:owner -- <storeSlug> <storeName> <username> <password> [pin] [displayName]");
  process.exit(1);
}

const normalizedUsername = normalizeUsername(username);
if (!isValidUsername(normalizedUsername)) {
  console.error("Username must be 3-32 chars using lowercase letters, numbers, dot, dash, or underscore.");
  process.exit(1);
}

if (pin && !isValidPin(pin)) {
  console.error("PIN must be exactly 6 digits.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const normalizedSlug = storeSlug.trim().toLowerCase();
const passwordHash = await hashPassword(password);
const pinHash = pin ? await hashPin(pin) : null;

const store = await prisma.store.upsert({
  where: { slug: normalizedSlug },
  update: {
    name: storeName,
    isActive: true,
  },
  create: {
    slug: normalizedSlug,
    name: storeName,
  },
});

await prisma.user.upsert({
  where: { username: normalizedUsername },
  update: {
    username: normalizedUsername,
    displayName,
    passwordHash,
    pinHash,
    platformRole: PlatformRole.NONE,
    storeRole: StoreRole.OWNER,
    storeId: store.id,
    isActive: true,
  },
  create: {
    username: normalizedUsername,
    displayName,
    passwordHash,
    pinHash,
    platformRole: PlatformRole.NONE,
    storeRole: StoreRole.OWNER,
    storeId: store.id,
  },
});

console.log(`Store owner ready: ${normalizedUsername} for ${store.name} (${store.slug})`);
await prisma.$disconnect();
