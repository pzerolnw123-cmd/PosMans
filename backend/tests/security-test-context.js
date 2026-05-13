const request = require("supertest");

jest.mock("../src/lib/db", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    storeLineIntegration: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loginChallenge: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: {
      aggregate: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      updateManyAndReturn: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    saleOrder: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    saleOrderItem: {
      groupBy: jest.fn(),
    },
    storePlan: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    storePlanUsage: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    customerDisplaySession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  },
}));

jest.mock("../src/utils/password", () => ({
  normalizeUsername: jest.fn((value) => String(value || "").trim().toLowerCase()),
  hashPassword: jest.fn().mockResolvedValue("new-password-hash"),
  hashPin: jest.fn().mockResolvedValue("new-pin-hash"),
  verifyPassword: jest.fn(),
  verifyPin: jest.fn(),
}));

jest.mock("../src/lib/r2", () => ({
  isR2Configured: jest.fn(() => false),
  createPresignedUpload: jest.fn(),
  deleteR2Object: jest.fn(),
}));

const { prisma } = require("../src/lib/db");
const { hashPassword, hashPin, verifyPassword, verifyPin } = require("../src/utils/password");
const { createPresignedUpload, deleteR2Object, isR2Configured } = require("../src/lib/r2");
const { createApp } = require("../src/app");
const { assertSafeHttpUrl, sanitizeRichText } = require("../src/utils/xss");
const { Prisma } = require("../src/generated/prisma");

function buildSessionUser(overrides = {}) {
  return {
    id: "user-1",
    username: "demoowner",
    displayName: "Owner",
    platformRole: "NONE",
    storeRole: "OWNER",
    storeId: "store-1",
    isActive: true,
    store: {
      id: "store-1",
      name: "Demo Store",
      slug: "demo-store",
      isActive: true,
    },
    ...overrides,
  };
}

function buildChallenge(userOverrides = {}) {
  return {
    id: "challenge-1",
    tokenHash: "hash",
    createdAt: new Date(Date.now() - 30_000),
    expiresAt: new Date(Date.now() + 4 * 60_000),
    userId: "user-1",
    user: buildSessionUser(userOverrides),
  };
}

function buildProduct(overrides = {}) {
  return {
    id: "product-1",
    code: "FOOD-001",
    name: "ข้าวกะเพรา",
    category: "อาหาร",
    price: 65,
    costPerUnit: 0,
    status: "พร้อมขาย",
    trackStock: false,
    stockQuantity: 0,
    lowStockThreshold: 0,
    imageUrl: null,
    uploadedKey: null,
    ...overrides,
  };
}

function buildSaleOrder(overrides = {}) {
  return {
    id: "sale-1",
    code: "SALE-20260422-RE-ABC12",
    status: "PAID",
    paymentMethod: "CASH",
    subtotal: 130,
    discount: 0,
    tax: 0,
    total: 130,
    note: null,
    createdAt: new Date("2026-04-22T10:00:00.000Z"),
    items: [
      {
        id: "sale-item-1",
        productId: "product-1",
        productCode: "FOOD-001",
        productName: "Pad Kra Pao",
        productCategory: "Food",
        quantity: 2,
        unitPrice: 65,
        lineTotal: 130,
      },
    ],
    createdBy: { id: "user-1", displayName: "Owner", username: "demoowner" },
    store: { id: "store-1", name: "Demo Store", slug: "demo-store", logoUrl: null },
    ...overrides,
  };
}

function mockOwnerSession(userOverrides = {}) {
  prisma.session.findUnique.mockResolvedValue({
    id: "session-1",
    createdAt: new Date(Date.now() - 10 * 60_000),
    expiresAt: new Date(Date.now() + 60_000),
    user: buildSessionUser(userOverrides),
  });
}

function makeUniqueConflictError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "6.7.0",
    meta: { target: ["storeId", "code"] },
  });
}

const originalEnv = process.env;

function installSecurityTestLifecycle() {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    prisma.session.delete.mockResolvedValue({ id: "session-1" });
    prisma.session.findMany.mockResolvedValue([]);
    prisma.loginChallenge.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.create.mockResolvedValue({ id: "audit" });
    prisma.product.count.mockResolvedValue(0);
    prisma.product.aggregate.mockResolvedValue({ _sum: { stockQuantity: 0 } });
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({});
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.updateManyAndReturn.mockResolvedValue([{ id: "product-1", stockQuantity: 1 }]);
    prisma.product.update.mockResolvedValue({});
    prisma.product.delete.mockResolvedValue({});
    prisma.inventoryMovement.create.mockResolvedValue({ id: "movement-1" });
    prisma.inventoryMovement.createMany.mockResolvedValue({ count: 1 });
    prisma.saleOrder.count.mockResolvedValue(0);
    prisma.saleOrder.findMany.mockResolvedValue([]);
    prisma.saleOrder.findFirst.mockResolvedValue(null);
    prisma.saleOrder.groupBy.mockResolvedValue([]);
    prisma.saleOrderItem.groupBy.mockResolvedValue([]);
    prisma.saleOrder.create.mockResolvedValue({
      id: "sale-1",
      code: "SALE-20260422-RE-ABC12",
      status: "PAID",
      paymentMethod: "CASH",
      subtotal: 65,
      discount: 0,
      tax: 0,
      total: 65,
      note: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      items: [
        {
          id: "sale-item-1",
          productId: "product-1",
          productCode: "FOOD-001",
          productName: "ข้าวกะเพรา",
          productCategory: "อาหาร",
          quantity: 1,
          unitPrice: 65,
          lineTotal: 65,
        },
      ],
    });
    prisma.customerDisplaySession.create.mockResolvedValue({
      id: "display-1",
      name: "จอลูกค้า",
      publicTokenHash: "hash",
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
    });
    prisma.customerDisplaySession.findMany.mockResolvedValue([]);
    prisma.customerDisplaySession.findFirst.mockResolvedValue(null);
    prisma.customerDisplaySession.findUnique.mockResolvedValue(null);
    prisma.customerDisplaySession.update.mockResolvedValue({
      id: "display-1",
      name: "จอลูกค้า",
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
    });
    prisma.customerDisplaySession.updateMany.mockResolvedValue({ count: 1 });
    prisma.store.findUnique.mockResolvedValue({ id: "store-1", logoUploadedKey: null });
    prisma.store.create.mockResolvedValue({ id: "store-new", name: "New Store", slug: "new-store" });
    prisma.store.update.mockResolvedValue({ id: "store-1", name: "Demo Store", slug: "demo-store" });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(buildSessionUser({
      id: "user-new",
      username: "newowner",
      displayName: "New Owner",
      storeId: "store-new",
      store: {
        id: "store-new",
        name: "New Store",
        slug: "new-store",
        isActive: true,
        logoUrl: null,
        logoUploadedKey: null,
        promptPayEnabled: false,
        promptPayRecipientType: "MOBILE",
        promptPayId: null,
        promptPayMobileId: null,
        promptPayNationalId: null,
        promptPayTaxId: null,
        bankName: null,
        bankAccountName: null,
        bankAccountNumber: null,
        paymentQrImageUrl: null,
        paymentQrUploadedKey: null,
      },
    }));
    prisma.storeLineIntegration.findUnique.mockResolvedValue(null);
    prisma.storeLineIntegration.upsert.mockResolvedValue({
      id: "line-1",
      storeId: "store-1",
      enabled: false,
      notifyOnSalePaid: true,
      recipientType: "USER",
      recipientId: null,
      channelAccessTokenEncrypted: null,
      channelAccessTokenHint: null,
      lastTestedAt: null,
      lastSuccessAt: null,
      lastError: null,
    });
    prisma.storeLineIntegration.update.mockResolvedValue({
      id: "line-1",
      storeId: "store-1",
      enabled: false,
      notifyOnSalePaid: true,
      recipientType: "USER",
      recipientId: null,
      channelAccessTokenEncrypted: null,
      channelAccessTokenHint: null,
      lastTestedAt: new Date("2026-04-22T00:00:00.000Z"),
      lastSuccessAt: null,
      lastError: null,
    });
    prisma.storePlan.upsert.mockResolvedValue({
      id: "plan-1",
      storeId: "store-1",
      tier: "START",
      status: "ACTIVE",
      lockVersion: 0,
    });
    prisma.storePlan.update.mockResolvedValue({
      id: "plan-1",
      storeId: "store-1",
      tier: "START",
      status: "ACTIVE",
      lockVersion: 1,
    });
    prisma.storePlanUsage.upsert.mockResolvedValue({
      id: "usage-1",
      storeId: "store-1",
      period: "2026-05",
      paymentConfirmCount: 0,
    });
    prisma.storePlanUsage.updateMany.mockResolvedValue({ count: 1 });
    prisma.$queryRaw.mockResolvedValue([{ maxCode: 0 }]);
    prisma.$transaction.mockImplementation((operations) => (typeof operations === "function" ? operations(prisma) : Promise.all(operations)));
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 60 * 60_000),
      user: buildSessionUser(),
    });
    prisma.loginChallenge.create.mockResolvedValue({ id: "challenge-1" });
    isR2Configured.mockReturnValue(false);
    createPresignedUpload.mockResolvedValue({
      objectKey: "stores/store-1/uploads/test.webp",
      upload: {
        method: "POST",
        url: "https://upload.example.com",
        fields: { key: "stores/store-1/uploads/test.webp", "Content-Type": "image/webp" },
      },
      maxUploadBytes: 5_242_880,
      publicUrl: "https://cdn.example.com/stores/store-1/uploads/test.webp",
    });
    deleteR2Object.mockResolvedValue(undefined);
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });
}

module.exports = {
  request, prisma, hashPassword, hashPin, verifyPassword, verifyPin, createPresignedUpload, deleteR2Object, isR2Configured, createApp, assertSafeHttpUrl, sanitizeRichText, buildSessionUser, buildChallenge, buildProduct, buildSaleOrder, mockOwnerSession, makeUniqueConflictError, originalEnv, installSecurityTestLifecycle,
};
