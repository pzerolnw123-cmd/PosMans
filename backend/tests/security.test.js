const request = require("supertest");

jest.mock("../src/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      deleteMany: jest.fn(),
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
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
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
const { createPresignedUpload, isR2Configured } = require("../src/lib/r2");
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

describe("backend security hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    prisma.loginChallenge.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.create.mockResolvedValue({ id: "audit" });
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({});
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.product.update.mockResolvedValue({});
    prisma.product.delete.mockResolvedValue({});
    prisma.inventoryMovement.create.mockResolvedValue({ id: "movement-1" });
    prisma.inventoryMovement.createMany.mockResolvedValue({ count: 1 });
    prisma.saleOrder.count.mockResolvedValue(0);
    prisma.saleOrder.findMany.mockResolvedValue([]);
    prisma.saleOrder.findFirst.mockResolvedValue(null);
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
    prisma.store.findUnique.mockResolvedValue({ id: "store-1", logoUploadedKey: null });
    prisma.store.update.mockResolvedValue({ id: "store-1", name: "Demo Store", slug: "demo-store" });
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
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("rejects password step without trusted origin", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/login").send({ username: "demoowner", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("BAD_ORIGIN");
  });

  test("issues csrf token from csrf endpoint", async () => {
    const app = createApp();

    const response = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");

    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toBeTruthy();
    expect(response.body.csrfToken).toContain(".");
    expect(response.headers["set-cookie"][0]).toContain("pos_mans_session_csrf");
  });

  test("rejects tampered signed csrf tokens", async () => {
    const app = createApp();
    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const tamperedToken = `${csrfResponse.body.csrfToken}tampered`;
    const csrfCookie = `pos_mans_session_csrf=${tamperedToken}`;

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", tamperedToken)
      .send({ username: "demoowner", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_MISMATCH");
  });

  test("rejects password step when csrf token is missing", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/login").set("Origin", "http://localhost:3000").send({
      username: "demoowner",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_MISMATCH");
  });

  test("creates a PIN challenge after valid username and password", async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({
      ...buildSessionUser(),
      passwordHash: "password-hash",
      pinHash: "pin-hash",
    });
    verifyPassword.mockResolvedValue(true);

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({ username: "demoowner", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.pinRequired).toBe(true);
    expect(response.body.pinSetupRequired).toBe(false);
    expect(prisma.loginChallenge.create).toHaveBeenCalled();
  });

  test("marks first login flow as requiring PIN setup when account has no PIN", async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({
      ...buildSessionUser(),
      passwordHash: "password-hash",
      pinHash: null,
    });
    verifyPassword.mockResolvedValue(true);

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({ username: "demoowner", password: "Password123!" });

    expect(response.status).toBe(200);
    expect(response.body.pinSetupRequired).toBe(true);
    expect(response.body.pinRequired).toBe(false);
  });

  test("verifies PIN and creates a real session", async () => {
    const app = createApp();
    prisma.loginChallenge.findUnique.mockResolvedValue(buildChallenge({ pinHash: "pin-hash" }));
    verifyPin.mockResolvedValue(true);

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/verify-pin")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie, "pos_mans_session_login_challenge=challenge-token"])
      .set("x-csrf-token", csrfToken)
      .send({ pin: "123456" });

    expect(response.status).toBe(200);
    expect(verifyPin).toHaveBeenCalled();
    expect(response.body.user.username).toBe("demoowner");
  });

  test("rejects invalid PIN during second step", async () => {
    const app = createApp();
    prisma.loginChallenge.findUnique.mockResolvedValue(buildChallenge({ pinHash: "pin-hash" }));
    verifyPin.mockResolvedValue(false);

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/verify-pin")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie, "pos_mans_session_login_challenge=challenge-token"])
      .set("x-csrf-token", csrfToken)
      .send({ pin: "999999" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid PIN");
  });

  test("sets a new PIN on first login and creates a real session", async () => {
    const app = createApp();
    prisma.loginChallenge.findUnique.mockResolvedValue(buildChallenge({ pinHash: null }));

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/setup-pin")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie, "pos_mans_session_login_challenge=challenge-token"])
      .set("x-csrf-token", csrfToken)
      .send({ pin: "123456", confirmPin: "123456" });

    expect(response.status).toBe(200);
    expect(hashPin).toHaveBeenCalledWith("123456");
    expect(prisma.user.update).toHaveBeenCalled();
    expect(response.body.user.username).toBe("demoowner");
  });

  test("rejects invalid upload policy requests when file name contains markup", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      user: buildSessionUser(),
    });

    const response = await request(app)
      .post("/api/uploads/sign")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        fileName: "<script>alert(1)</script>.png",
        contentType: "image/png",
        contentLength: 120,
        purpose: "PRODUCT_IMAGE",
      });

    expect(response.status).toBe(400);
  });

  test("issues owner upload policies under the current store prefix", async () => {
    const app = createApp();
    mockOwnerSession();
    isR2Configured.mockReturnValue(true);

    const response = await request(app)
      .post("/api/uploads/sign")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        fileName: "logo.webp",
        contentType: "image/webp",
        contentLength: 120,
        purpose: "STORE_LOGO",
      });

    expect(response.status).toBe(200);
    expect(createPresignedUpload).toHaveBeenCalledWith(
      {
        fileName: "logo.webp",
        contentType: "image/webp",
        contentLength: 120,
        purpose: "STORE_LOGO",
      },
      { prefix: "stores/store-1/uploads" },
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPLOAD_POLICY_ISSUED",
        actorUserId: "user-1",
        metadata: expect.objectContaining({
          scope: "stores/store-1/uploads",
          storeId: "store-1",
        }),
      }),
    });
  });

  test("rejects non-image uploads", async () => {
    const app = createApp();
    mockOwnerSession();
    isR2Configured.mockReturnValue(true);

    const response = await request(app)
      .post("/api/uploads/sign")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        fileName: "receipt.pdf",
        contentType: "application/pdf",
        contentLength: 120,
        purpose: "PRODUCT_IMAGE",
      });

    expect(response.status).toBe(400);
    expect(createPresignedUpload).not.toHaveBeenCalled();
  });

  test("extends active session expiry on authenticated requests when close to expiry", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 5 * 60_000),
      user: buildSessionUser(),
    });

    const response = await request(app).get("/api/auth/me").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(prisma.session.update).toHaveBeenCalled();
    expect(response.headers["set-cookie"][0]).toContain("pos_mans_session=");
  });

  test("does not extend a session that is still fresh", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 45 * 60_000),
      user: buildSessionUser(),
    });

    const response = await request(app).get("/api/auth/me").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  test("keeps sensitive payment identifiers out of the general session response", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 45 * 60_000),
      user: buildSessionUser({
        store: {
          id: "store-1",
          name: "Demo Store",
          slug: "demo-store",
          isActive: true,
          promptPayMobileId: "0812345678",
          bankAccountNumber: "1234567890",
        },
      }),
    });

    const response = await request(app).get("/api/auth/me").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.user.store.promptPayMobileId).toBeUndefined();
    expect(response.body.user.store.bankAccountNumber).toBeUndefined();
  });

  test("returns sensitive payment settings only from the owner-scoped endpoint", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.store.findUnique.mockResolvedValue({
      id: "store-1",
      name: "Demo Store",
      slug: "demo-store",
      logoUrl: null,
      logoUploadedKey: null,
      promptPayEnabled: true,
      promptPayRecipientType: "MOBILE",
      promptPayId: "0812345678",
      promptPayMobileId: "0812345678",
      promptPayNationalId: null,
      promptPayTaxId: null,
      bankName: null,
      bankAccountName: null,
      bankAccountNumber: null,
      paymentQrImageUrl: null,
      paymentQrUploadedKey: null,
    });

    const response = await request(app).get("/api/auth/owner-payment-settings").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.store.promptPayMobileId).toBe("0812345678");
    expect(prisma.store.findUnique).toHaveBeenCalledWith({
      where: { id: "store-1" },
      select: expect.objectContaining({ promptPayMobileId: true, bankAccountNumber: true }),
    });
  });

  test("lets an authenticated user change password with the current password", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      passwordHash: "old-password-hash",
      isActive: true,
    });
    verifyPassword.mockResolvedValue(true);
    hashPassword.mockResolvedValue("new-password-hash");
    prisma.user.update.mockResolvedValue({ id: "user-1" });

    const response = await request(app)
      .patch("/api/auth/password")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });

    expect(response.status).toBe(200);
    expect(verifyPassword).toHaveBeenCalledWith("Password123!", "old-password-hash");
    expect(hashPassword).toHaveBeenCalledWith("NewPassword123!");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-password-hash" },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        id: { not: "session-1" },
      },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "PASSWORD_CHANGED",
        actorUserId: "user-1",
      }),
    });
  });

  test("rejects owner profile updates containing markup", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .patch("/api/auth/owner-profile")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        storeName: "<script>alert(1)</script>",
        ownerName: "Owner",
      });

    expect(response.status).toBe(400);
    expect(prisma.store.update).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test("updates owner store name and display name for the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.store.update.mockResolvedValue({ id: "store-1", name: "New Store", slug: "demo-store", logoUrl: null, logoUploadedKey: null });
    prisma.user.update.mockResolvedValue({ id: "user-1", displayName: "New Owner" });

    const response = await request(app)
      .patch("/api/auth/owner-profile")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        storeName: "New Store",
        ownerName: "New Owner",
      });

    expect(response.status).toBe(200);
    expect(prisma.store.update).toHaveBeenCalledWith({
      where: { id: "store-1" },
      data: { name: "New Store" },
      select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { displayName: "New Owner" },
      select: { id: true, displayName: true },
    });
    expect(response.body.user.displayName).toBe("New Owner");
    expect(response.body.user.store.name).toBe("New Store");
  });

  test("updates owner logo for the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.store.findUnique.mockResolvedValue({ id: "store-1", logoUploadedKey: null });
    prisma.store.update.mockResolvedValue({
      id: "store-1",
      name: "Demo Store",
      slug: "demo-store",
      logoUrl: "https://cdn.example.com/stores/store-1/uploads/logo.webp",
      logoUploadedKey: "stores/store-1/uploads/logo.webp",
    });

    const response = await request(app)
      .patch("/api/auth/owner-logo")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        logoUrl: "https://cdn.example.com/stores/store-1/uploads/logo.webp",
        uploadedKey: "stores/store-1/uploads/logo.webp",
      });

    expect(response.status).toBe(200);
    expect(prisma.store.update).toHaveBeenCalledWith({
      where: { id: "store-1" },
      data: {
        logoUrl: "https://cdn.example.com/stores/store-1/uploads/logo.webp",
        logoUploadedKey: "stores/store-1/uploads/logo.webp",
      },
      select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "STORE_LOGO_UPDATED",
        actorUserId: "user-1",
        targetType: "store",
        targetId: "store-1",
      }),
    });
    expect(response.body.store.logoUrl).toBe("https://cdn.example.com/stores/store-1/uploads/logo.webp");
  });

  test("rejects owner logo uploads outside the current store scope", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .patch("/api/auth/owner-logo")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        logoUrl: "https://cdn.example.com/stores/store-2/uploads/logo.webp",
        uploadedKey: "stores/store-2/uploads/logo.webp",
      });

    expect(response.status).toBe(403);
    expect(prisma.store.update).not.toHaveBeenCalled();
  });

  test("rejects sessions that exceed the absolute timeout", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 13 * 60 * 60_000),
      expiresAt: new Date(Date.now() + 5 * 60_000),
      user: buildSessionUser(),
    });

    const response = await request(app).get("/api/auth/me").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(401);
  });

  test("rejects the default session secret in production", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      FRONTEND_URL: "https://pos.example.com",
      DATABASE_URL: "postgresql://db-user:db-pass@db.example.com:5432/app",
      DIRECT_DATABASE_URL: "postgresql://db-user:db-pass@db.example.com:5432/app",
      SESSION_SECRET: "replace-this-development-session-secret-with-32-chars",
    };

    expect(() => {
      jest.isolateModules(() => {
        require("../src/config/env");
      });
    }).toThrow("SESSION_SECRET must be overridden in production");
  });

  test("rejects insecure frontend url in production", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      FRONTEND_URL: "http://pos.example.com",
      DATABASE_URL: "postgresql://db-user:db-pass@db.example.com:5432/app",
      DIRECT_DATABASE_URL: "postgresql://db-user:db-pass@db.example.com:5432/app",
      SESSION_SECRET: "production-session-secret-with-more-than-32-chars",
    };

    expect(() => {
      jest.isolateModules(() => {
        require("../src/config/env");
      });
    }).toThrow("FRONTEND_URL must use HTTPS in production");
  });

  test("rejects partial R2 upload configuration", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      R2_ACCESS_KEY_ID: "key-only",
    };

    expect(() => {
      jest.isolateModules(() => {
        require("../src/config/env");
      });
    }).toThrow();
  });

  test("allows platform admins to request upload signing", async () => {
    const app = createApp();
    prisma.session.findUnique.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 60_000),
      user: buildSessionUser({
        username: "superadmin",
        displayName: "Platform Admin",
        platformRole: "SUPER_ADMIN",
        storeRole: null,
        storeId: null,
        store: null,
      }),
    });

    const response = await request(app)
      .post("/api/uploads/sign")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        fileName: "platform-image.webp",
        contentType: "image/webp",
        contentLength: 120,
        purpose: "PRODUCT_IMAGE",
      });

    expect(response.status).toBe(503);
  });

  test("returns paginated products for owner store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.count.mockResolvedValue(4);
    prisma.product.findMany.mockResolvedValue([buildProduct(), buildProduct({ id: "product-2", code: "FOOD-002", name: "ข้าวผัด", price: 70 })]);

    const response = await request(app)
      .get("/api/products?page=2&pageSize=2&category=อาหาร")
      .set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(prisma.product.count).toHaveBeenCalledWith({ where: { storeId: "store-1", category: "อาหาร" } });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 2,
        take: 2,
      }),
    );
    expect(response.body.products).toHaveLength(2);
    expect(response.body.pagination).toEqual({
      page: 2,
      pageSize: 2,
      totalItems: 4,
      totalPages: 2,
    });
  });

  test("creates product and retries when generated code collides", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.$queryRaw.mockResolvedValueOnce([{ maxCode: 1 }]).mockResolvedValueOnce([{ maxCode: 2 }]);
    prisma.product.create
      .mockRejectedValueOnce(makeUniqueConflictError())
      .mockResolvedValueOnce(buildProduct({ id: "product-2", code: "DRINK-003", name: "ชาไทย", category: "เครื่องดื่ม", price: 45 }));

    const response = await request(app)
      .post("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "ชาไทย",
        category: "เครื่องดื่ม",
        price: 45,
        status: "พร้อมขาย",
      });

    expect(response.status).toBe(201);
    expect(prisma.product.create).toHaveBeenCalledTimes(2);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "PRODUCT_CREATED",
        actorUserId: "user-1",
        targetType: "product",
        targetId: "product-2",
      }),
    });
    expect(response.body.product.code).toBe("DRINK-003");
  });

  test("rejects product image uploads outside the current store scope", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .post("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "รูปผิดร้าน",
        category: "อาหาร",
        price: 65,
        status: "พร้อมขาย",
        imageUrl: "https://cdn.example.com/stores/store-2/uploads/product.webp",
        uploadedKey: "stores/store-2/uploads/product.webp",
      });

    expect(response.status).toBe(403);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects product image urls without an uploaded key", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .post("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "รูปไม่มี key",
        category: "อาหาร",
        price: 65,
        status: "พร้อมขาย",
        imageUrl: "https://cdn.example.com/stores/store-1/uploads/product.webp",
      });

    expect(response.status).toBe(400);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects product create with invalid price", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .post("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "ราคาผิด",
        category: "อาหาร",
        price: -1,
        status: "พร้อมขาย",
      });

    expect(response.status).toBe(400);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("rejects product create with unexpected fields", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .post("/api/products")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "สินค้าใหม่",
        category: "อาหาร",
        price: 99,
        storeId: "other-store",
      });

    expect(response.status).toBe(400);
    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  test("updates only products owned by the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findFirst.mockResolvedValue({ id: "product-1", uploadedKey: null, trackStock: false, stockQuantity: 0, lowStockThreshold: 0 });
    prisma.product.update.mockResolvedValue(buildProduct({ name: "ข้าวกะเพราพิเศษ", price: 75 }));

    const response = await request(app)
      .patch("/api/products/product-1")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "ข้าวกะเพราพิเศษ",
        price: 75,
      });

    expect(response.status).toBe(200);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: "product-1", storeId: "store-1" },
      select: { id: true, uploadedKey: true, trackStock: true, stockQuantity: true, lowStockThreshold: true },
    });
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "product-1" },
        data: expect.objectContaining({ name: "ข้าวกะเพราพิเศษ", price: 75 }),
      }),
    );
  });

  test("returns 404 when updating product outside current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/products/product-other-store")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        name: "ไม่ควรแก้ได้",
      });

    expect(response.status).toBe(404);
    expect(prisma.product.update).not.toHaveBeenCalled();
  });

  test("deletes only products owned by the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findFirst.mockResolvedValue({ id: "product-1" });
    prisma.product.delete.mockResolvedValue(buildProduct());

    const response = await request(app)
      .delete("/api/products/product-1")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token");

    expect(response.status).toBe(204);
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: "product-1", storeId: "store-1" },
      select: { id: true, uploadedKey: true },
    });
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: "product-1" } });
  });

  test("lists receipts for the current owner store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.saleOrder.count.mockResolvedValue(1);
    prisma.saleOrder.findMany.mockResolvedValue([buildSaleOrder()]);

    const response = await request(app)
      .get("/api/sales?date=2026-04-22")
      .set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.receipts).toHaveLength(1);
    expect(response.body.receipts[0]).toEqual(
      expect.objectContaining({
        id: "sale-1",
        code: "SALE-20260422-RE-ABC12",
        itemCount: 2,
        total: 130,
      }),
    );
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 12,
        totalItems: 1,
        totalPages: 1,
      }),
    );
    expect(prisma.saleOrder.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          storeId: "store-1",
          createdAt: {
            gte: new Date("2026-04-21T17:00:00.000Z"),
            lt: new Date("2026-04-22T17:00:00.000Z"),
          },
        }),
      }),
    );
    expect(prisma.saleOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 12,
      }),
    );
  });

  test("returns a store-scoped receipt detail", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.saleOrder.findFirst.mockResolvedValue(buildSaleOrder());

    const response = await request(app)
      .get("/api/sales/sale-1")
      .set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.receipt).toEqual(
      expect.objectContaining({
        id: "sale-1",
        code: "SALE-20260422-RE-ABC12",
        itemCount: 2,
        store: expect.objectContaining({ id: "store-1" }),
      }),
    );
    expect(prisma.saleOrder.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sale-1", storeId: "store-1" },
      }),
    );
  });

  test("creates a paid sale from current store products using server prices", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([
      buildProduct({ id: "product-1", price: 65, status: "พร้อมขาย" }),
      buildProduct({ id: "product-2", code: "DRINK-001", name: "ชาไทย", category: "เครื่องดื่ม", price: 45, status: "พร้อมขาย" }),
    ]);
    prisma.saleOrder.create.mockResolvedValue({
      id: "sale-1",
      code: "SALE-20260422-RE-ABC12",
      status: "PAID",
      paymentMethod: "CASH",
      subtotal: 175,
      discount: 0,
      tax: 0,
      total: 175,
      note: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      items: [
        {
          id: "sale-item-1",
          productId: "product-1",
          productCode: "FOOD-001",
          productName: "ข้าวกะเพรา",
          productCategory: "อาหาร",
          quantity: 2,
          unitPrice: 65,
          lineTotal: 130,
        },
        {
          id: "sale-item-2",
          productId: "product-2",
          productCode: "DRINK-001",
          productName: "ชาไทย",
          productCategory: "เครื่องดื่ม",
          quantity: 1,
          unitPrice: 45,
          lineTotal: 45,
        },
      ],
    });

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        items: [
          { productId: "product-1", quantity: 2 },
          { productId: "product-2", quantity: 1 },
        ],
      });

    expect(response.status).toBe(201);
    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["product-1", "product-2"] }, storeId: "store-1" },
      select: { id: true, code: true, name: true, category: true, price: true, status: true, trackStock: true, stockQuantity: true, lowStockThreshold: true },
    });
    expect(prisma.saleOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: "store-1",
          createdByUserId: "user-1",
          subtotal: 175,
          total: 175,
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({ productId: "product-1", quantity: 2, unitPrice: 65, lineTotal: 130 }),
              expect.objectContaining({ productId: "product-2", quantity: 1, unitPrice: 45, lineTotal: 45 }),
            ]),
          },
        }),
        select: expect.any(Object),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "SALE_CREATED",
        actorUserId: "user-1",
        targetType: "saleOrder",
        targetId: "sale-1",
      }),
    });
    expect(response.body.sale.total).toBe(175);
  });

  test("deducts tracked stock and records inventory movement on sale checkout", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct({ id: "product-1", price: 65, status: "พร้อมขาย", trackStock: true, stockQuantity: 3, lowStockThreshold: 1 })]);
    prisma.saleOrder.create.mockResolvedValue({
      id: "sale-1",
      code: "SALE-20260422-RE-ABC12",
      status: "PAID",
      paymentMethod: "CASH",
      subtotal: 130,
      discount: 0,
      tax: 0,
      total: 130,
      note: null,
      createdAt: new Date("2026-04-22T00:00:00.000Z"),
      items: [
        {
          id: "sale-item-1",
          productId: "product-1",
          productCode: "FOOD-001",
          productName: "ข้าวกะเพรา",
          productCategory: "อาหาร",
          quantity: 2,
          unitPrice: 65,
          lineTotal: 130,
        },
      ],
    });

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        items: [{ productId: "product-1", quantity: 2 }],
      });

    expect(response.status).toBe(201);
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        storeId: "store-1",
        trackStock: true,
        stockQuantity: { gte: 2 },
      },
      data: {
        stockQuantity: { decrement: 2 },
      },
    });
    expect(prisma.inventoryMovement.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
        storeId: "store-1",
        productId: "product-1",
        createdByUserId: "user-1",
        type: "SALE",
        quantityChange: -2,
        quantityBefore: 3,
        quantityAfter: 1,
        referenceType: "saleOrder",
        referenceId: "sale-1",
        }),
      ],
    });
  });

  test("rejects sale checkout when tracked stock is insufficient", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct({ id: "product-1", price: 65, status: "พร้อมขาย", trackStock: true, stockQuantity: 1 })]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        items: [{ productId: "product-1", quantity: 2 }],
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SALE_INSUFFICIENT_STOCK");
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
    expect(prisma.inventoryMovement.createMany).not.toHaveBeenCalled();
  });

  test("rejects sale checkout when a product is outside the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        items: [{ productId: "product-other-store", quantity: 1 }],
      });

    expect(response.status).toBe(404);
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
  });

  test("rejects sale checkout when a product is closed", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct({ status: "ปิดขาย" })]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        items: [{ productId: "product-1", quantity: 1 }],
      });

    expect(response.status).toBe(409);
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
  });

  test("rejects sale checkout when discount exceeds subtotal", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct({ price: 65, status: "พร้อมขาย" })]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        discount: 66,
        items: [{ productId: "product-1", quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("SALE_BAD_DISCOUNT");
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
  });

  test("rejects sale checkout when tax exceeds configured subtotal policy", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct({ price: 65, status: "พร้อมขาย" })]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        tax: 66,
        items: [{ productId: "product-1", quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("SALE_BAD_TAX");
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
  });

  test("rejects sale notes containing markup", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        note: "<script>alert(1)</script>",
        items: [{ productId: "product-1", quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
  });

  test("rejects javascript urls", () => {
    expect(() => assertSafeHttpUrl("javascript:alert(1)", "link")).toThrow();
  });

  test("sanitizes rich text output", () => {
    const sanitized = sanitizeRichText('<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>');
    expect(sanitized).toContain("<p>Hello</p>");
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("javascript:");
  });
});
