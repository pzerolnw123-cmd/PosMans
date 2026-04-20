import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaClient from "../src/generated/prisma/index.js";
import passwordUtils from "../src/utils/password.js";

const { PlatformRole, PrismaClient } = prismaClient;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const { hashPassword, hashPin, isValidPin, isValidUsername, normalizeUsername } = passwordUtils;

const username = process.argv[2] || process.env.PLATFORM_ADMIN_SEED_USERNAME;
const password = process.argv[3] || process.env.PLATFORM_ADMIN_SEED_PASSWORD;
const pin = process.argv[4] || process.env.PLATFORM_ADMIN_SEED_PIN;
const displayName = process.argv[5] || "POS MANS Platform Admin";

if (!username || !password || !pin) {
  console.error("Usage: npm run create:admin -- <username> <password> <pin> [displayName]");
  process.exit(1);
}

const normalizedUsername = normalizeUsername(username);
if (!isValidUsername(normalizedUsername)) {
  console.error("Username must be 3-32 chars using lowercase letters, numbers, dot, dash, or underscore.");
  process.exit(1);
}

if (!isValidPin(pin)) {
  console.error("PIN must be exactly 6 digits.");
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const passwordHash = await hashPassword(password);
const pinHash = await hashPin(pin);

await prisma.user.upsert({
  where: { username: normalizedUsername },
  update: {
    username: normalizedUsername,
    displayName,
    passwordHash,
    pinHash,
    platformRole: PlatformRole.SUPER_ADMIN,
    storeRole: null,
    storeId: null,
    isActive: true,
  },
  create: {
    username: normalizedUsername,
    displayName,
    passwordHash,
    pinHash,
    platformRole: PlatformRole.SUPER_ADMIN,
  },
});

console.log(`Platform admin ready: ${normalizedUsername}`);
await prisma.$disconnect();
