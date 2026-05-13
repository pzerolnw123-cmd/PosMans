import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import prismaClient from "../src/generated/prisma/index.js";
import passwordUtils from "../src/utils/password.js";

const { PlatformRole, PrismaClient, StoreRole } = prismaClient;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const { hashPassword, hashPin, normalizeUsername } = passwordUtils;

const username = normalizeUsername(process.env.E2E_OWNER_USERNAME || "e2e.owner");
const password = process.env.E2E_OWNER_PASSWORD || "E2eOwnerPassword123!";
const pin = process.env.E2E_OWNER_PIN || "123456";
const storeSlug = process.env.E2E_STORE_SLUG || "e2e-store";
const storeName = process.env.E2E_STORE_NAME || "E2E Store";

const store = await prisma.store.upsert({
  where: { slug: storeSlug },
  update: {
    name: storeName,
    isActive: true,
    promptPayEnabled: true,
    promptPayRecipientType: "MOBILE",
    promptPayMobileId: "0812345678",
  },
  create: {
    slug: storeSlug,
    name: storeName,
    promptPayEnabled: true,
    promptPayRecipientType: "MOBILE",
    promptPayMobileId: "0812345678",
  },
});

await prisma.user.upsert({
  where: { username },
  update: {
    displayName: "E2E Owner",
    passwordHash: await hashPassword(password),
    pinHash: await hashPin(pin),
    platformRole: PlatformRole.NONE,
    storeRole: StoreRole.OWNER,
    storeId: store.id,
    isActive: true,
  },
  create: {
    username,
    displayName: "E2E Owner",
    passwordHash: await hashPassword(password),
    pinHash: await hashPin(pin),
    platformRole: PlatformRole.NONE,
    storeRole: StoreRole.OWNER,
    storeId: store.id,
    isActive: true,
  },
});

await prisma.product.upsert({
  where: {
    storeId_code: {
      storeId: store.id,
      code: "E2E-FOOD-001",
    },
  },
  update: {
    name: "E2E ข้าวกะเพรา",
    category: "อาหาร",
    price: 50,
    costPerUnit: 25,
    status: "พร้อมขาย",
    trackStock: true,
    stockQuantity: 20,
    lowStockThreshold: 3,
  },
  create: {
    storeId: store.id,
    code: "E2E-FOOD-001",
    name: "E2E ข้าวกะเพรา",
    category: "อาหาร",
    price: 50,
    costPerUnit: 25,
    status: "พร้อมขาย",
    trackStock: true,
    stockQuantity: 20,
    lowStockThreshold: 3,
  },
});

console.log(`E2E seed ready for ${username} (${store.slug}).`);
await prisma.$disconnect();
