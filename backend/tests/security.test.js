const request = require("supertest");

jest.mock("../src/lib/db", () => ({
  prisma: {
    user: {
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
    },
  },
}));

jest.mock("../src/utils/password", () => ({
  normalizeUsername: jest.fn((value) => String(value || "").trim().toLowerCase()),
  hashPin: jest.fn().mockResolvedValue("new-pin-hash"),
  verifyPassword: jest.fn(),
  verifyPin: jest.fn(),
}));

const { prisma } = require("../src/lib/db");
const { hashPin, verifyPassword, verifyPin } = require("../src/utils/password");
const { createApp } = require("../src/app");
const { assertSafeHttpUrl, sanitizeRichText } = require("../src/utils/xss");

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

describe("backend security hardening", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.session.deleteMany.mockResolvedValue({ count: 0 });
    prisma.loginChallenge.deleteMany.mockResolvedValue({ count: 0 });
    prisma.auditLog.create.mockResolvedValue({ id: "audit" });
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

  test("extends active session expiry on authenticated requests", async () => {
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
