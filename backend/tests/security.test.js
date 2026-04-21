const request = require("supertest");

jest.mock("../src/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    store: {
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
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((operations) => Promise.all(operations)),
  },
}));

jest.mock("../src/utils/password", () => ({
  normalizeUsername: jest.fn((value) => String(value || "").trim().toLowerCase()),
  hashPassword: jest.fn().mockResolvedValue("new-password-hash"),
  hashPin: jest.fn().mockResolvedValue("new-pin-hash"),
  verifyPassword: jest.fn(),
  verifyPin: jest.fn(),
}));

const { prisma } = require("../src/lib/db");
const { hashPassword, hashPin, verifyPassword, verifyPin } = require("../src/utils/password");
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
    imageUrl: null,
    uploadedKey: null,
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
    prisma.auditLog.create.mockResolvedValue({ id: "audit" });
    prisma.product.count.mockResolvedValue(0);
    prisma.product.findMany.mockResolvedValue([]);
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({});
    prisma.product.update.mockResolvedValue({});
    prisma.product.delete.mockResolvedValue({});
    prisma.store.update.mockResolvedValue({ id: "store-1", name: "Demo Store", slug: "demo-store" });
    prisma.$queryRaw.mockResolvedValue([{ maxCode: 0 }]);
    prisma.$transaction.mockImplementation((operations) => Promise.all(operations));
    prisma.session.update.mockResolvedValue({
      id: "session-1",
      createdAt: new Date(Date.now() - 10 * 60_000),
      expiresAt: new Date(Date.now() + 60 * 60_000),
      user: buildSessionUser(),
    });
    prisma.loginChallenge.create.mockResolvedValue({ id: "challenge-1" });
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
    expect(response.headers["set-cookie"][0]).toContain("pos_mans_session_csrf");
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
      });

    expect(response.status).toBe(400);
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
    prisma.store.update.mockResolvedValue({ id: "store-1", name: "New Store", slug: "demo-store" });
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
      select: { id: true, name: true, slug: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { displayName: "New Owner" },
      select: { id: true, displayName: true },
    });
    expect(response.body.user.displayName).toBe("New Owner");
    expect(response.body.user.store.name).toBe("New Store");
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
        fileName: "menu.pdf",
        contentType: "application/pdf",
        contentLength: 120,
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
    expect(response.body.product.code).toBe("DRINK-003");
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

  test("updates only products owned by the current store", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findFirst.mockResolvedValue({ id: "product-1" });
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
      select: { id: true, uploadedKey: true },
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
