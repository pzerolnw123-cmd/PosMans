const { request, prisma, hashPassword, hashPin, verifyPassword, verifyPin, createPresignedUpload, isR2Configured, createApp, assertSafeHttpUrl, sanitizeRichText, buildSessionUser, buildChallenge, buildProduct, buildSaleOrder, mockOwnerSession, makeUniqueConflictError, originalEnv, installSecurityTestLifecycle } = require("./security-test-context");

describe("backend security hardening - owner settings and config", () => {
  installSecurityTestLifecycle();

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
      select: { id: true, displayName: true, ownerTheme: true },
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

});
