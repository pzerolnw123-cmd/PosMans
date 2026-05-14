const { request, prisma, hashPassword, hashPin, verifyPassword, verifyPin, createPresignedUpload, isR2Configured, createApp, assertSafeHttpUrl, sanitizeRichText, buildSessionUser, buildChallenge, buildProduct, buildSaleOrder, mockOwnerSession, makeUniqueConflictError, originalEnv, installSecurityTestLifecycle } = require("./security-test-context");

describe("backend security hardening - auth and sessions", () => {
  installSecurityTestLifecycle();

  test("rejects password step without trusted origin", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/login").send({ username: "demoowner", password: "Password123!" });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("ไม่สามารถดำเนินการตามคำขอได้ กรุณารีเฟรชหน้าแล้วลองใหม่");
    expect(response.body.code).toBeUndefined();
  });

  test("issues csrf token from csrf endpoint", async () => {
    const app = createApp();

    const response = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");

    expect(response.status).toBe(200);
    expect(response.body.csrfToken).toBeTruthy();
    expect(response.body.csrfToken).toContain(".");
    expect(response.headers["set-cookie"][0]).toContain("pos_mans_session_csrf");
  });

  test("rejects owner sessions from superadmin endpoints", async () => {
    const app = createApp();
    mockOwnerSession();

    const response = await request(app).get("/api/superadmin/overview").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(403);
    expect(prisma.store.findUnique).not.toHaveBeenCalled();
    expect(prisma.saleOrder.findMany).not.toHaveBeenCalled();
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
    expect(response.body.error).toBe("เซสชันของหน้านี้หมดอายุ กรุณารีเฟรชหน้าแล้วลองใหม่");
    expect(response.body.code).toBe("CSRF_MISMATCH");
  });

  test("rejects password step when csrf token is missing", async () => {
    const app = createApp();

    const response = await request(app).post("/api/auth/login").set("Origin", "http://localhost:3000").send({
      username: "demoowner",
      password: "Password123!",
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("เซสชันของหน้านี้หมดอายุ กรุณารีเฟรชหน้าแล้วลองใหม่");
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

  test("returns the normal credential error when a short login password is wrong", async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({
      ...buildSessionUser(),
      passwordHash: "password-hash",
      pinHash: "pin-hash",
    });
    verifyPassword.mockResolvedValue(false);

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({ username: "demoowner", password: "x" });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    expect(prisma.loginChallenge.create).not.toHaveBeenCalled();
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

  test("marks first superadmin login as requiring PIN setup when account has no PIN", async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({
      ...buildSessionUser({
        username: "admin_pzerolnw123",
        displayName: "Platform Admin",
        platformRole: "SUPER_ADMIN",
        storeRole: null,
        storeId: null,
        store: null,
      }),
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
      .send({ username: "admin_pzerolnw123", password: "Loveptn123?" });

    expect(response.status).toBe(200);
    expect(response.body.pinSetupRequired).toBe(true);
    expect(response.body.pinRequired).toBe(false);
    expect(prisma.loginChallenge.create).toHaveBeenCalled();
  });

  test("registers a new owner store with csrf and leaves PIN setup to login", async () => {
    const app = createApp();
    prisma.store.findUnique.mockResolvedValue(null);
    prisma.store.create.mockResolvedValue({ id: "store-new", name: "New Cafe", slug: "new-cafe" });
    prisma.user.create.mockResolvedValue(buildSessionUser({
      id: "user-new",
      username: "newowner",
      displayName: "New Owner",
      storeId: "store-new",
      store: {
        id: "store-new",
        name: "New Cafe",
        slug: "new-cafe",
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

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({
        storeName: "New Cafe",
        ownerName: "New Owner",
        username: "NewOwner",
        password: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(response.status).toBe(201);
    expect(hashPassword).toHaveBeenCalledWith("Password123!");
    expect(prisma.store.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "New Cafe",
        slug: "new-cafe",
        plan: { create: { tier: "START", status: "ACTIVE", lockVersion: 0 } },
      }),
    });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        username: "newowner",
        displayName: "New Owner",
        pinHash: null,
        storeRole: "OWNER",
        storeId: "store-new",
      }),
    }));
    expect(prisma.session.create).not.toHaveBeenCalled();
    expect(response.body.loginRequired).toBe(true);
    expect(response.body.user.username).toBe("newowner");
  });

  test("rejects registration when username already exists", async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({ id: "existing-user" });

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({
        storeName: "New Cafe",
        ownerName: "New Owner",
        username: "demoowner",
        password: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("USERNAME_TAKEN");
    expect(prisma.store.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("rejects registration text that contains inappropriate language", async () => {
    const app = createApp();

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({
        storeName: "bad fuck cafe",
        ownerName: "New Owner",
        username: "newowner",
        password: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนบันทึก");
    expect(prisma.store.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test("rejects registration usernames that contain inappropriate language", async () => {
    const app = createApp();

    const csrfResponse = await request(app).get("/api/auth/csrf").set("Origin", "http://localhost:3000");
    const csrfCookie = csrfResponse.headers["set-cookie"][0].split(";")[0];
    const csrfToken = csrfResponse.body.csrfToken;

    const response = await request(app)
      .post("/api/auth/register")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [csrfCookie])
      .set("x-csrf-token", csrfToken)
      .send({
        storeName: "New Cafe",
        ownerName: "New Owner",
        username: "f.u.c.k",
        password: "Password123!",
        confirmPassword: "Password123!",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("ข้อความมีคำไม่เหมาะสม กรุณาแก้ไขก่อนบันทึก");
    expect(prisma.store.create).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
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
    expect(response.body.error).toBe("PIN ไม่ถูกต้อง");
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

  test("returns LINE settings without exposing the channel token", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.storeLineIntegration.findUnique.mockResolvedValue({
      id: "line-1",
      storeId: "store-1",
      enabled: true,
      notifyOnSalePaid: true,
      recipientType: "USER",
      recipientId: "U1234567890abcdef1234567890abcdef",
      channelAccessTokenEncrypted: "encrypted-token",
      channelAccessTokenHint: "••••abcd",
      lastTestedAt: null,
      lastSuccessAt: null,
      lastError: null,
    });

    const response = await request(app).get("/api/auth/owner-line-settings").set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.line.hasChannelAccessToken).toBe(true);
    expect(response.body.line.channelAccessTokenHint).toBe("••••abcd");
    expect(response.body.line.channelAccessTokenEncrypted).toBeUndefined();
  });

  test("returns owner plan summary without trusting frontend state", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.storePlan.upsert.mockResolvedValue({
      id: "plan-1",
      storeId: "store-1",
      tier: "START",
      status: "ACTIVE",
      lockVersion: 0,
    });
    prisma.storePlanUsage.upsert.mockResolvedValue({
      id: "usage-1",
      storeId: "store-1",
      period: "2026-05",
      paymentConfirmCount: 12,
    });
    prisma.product.count.mockResolvedValue(4);
    prisma.product.aggregate.mockResolvedValue({ _sum: { stockQuantity: 120 } });

    const response = await request(app)
      .get("/api/auth/owner-plan")
      .set("Cookie", ["pos_mans_session=session-token"]);

    expect(response.status).toBe(200);
    expect(response.body.plan).toEqual(
      expect.objectContaining({
        plan: "START",
        status: "ACTIVE",
        limits: expect.objectContaining({
          paymentConfirmationsPerMonth: 30,
          products: 7,
          stockQuantityTotal: 300,
        }),
        usage: expect.objectContaining({
          paymentConfirmationsThisMonth: 12,
          products: 4,
          stockQuantityTotal: 120,
        }),
      }),
    );
  });

  test("requires a LINE token before enabling sale notifications", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.storeLineIntegration.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .patch("/api/auth/owner-line-settings")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        enabled: true,
        notifyOnSalePaid: true,
        recipientType: "USER",
        recipientId: "U1234567890abcdef1234567890abcdef",
      });

    expect(response.status).toBe(400);
    expect(prisma.storeLineIntegration.upsert).not.toHaveBeenCalled();
  });

  test("rejects LINE recipient IDs that do not match the selected recipient type", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.storeLineIntegration.findUnique.mockResolvedValue({
      id: "line-1",
      storeId: "store-1",
      channelAccessTokenEncrypted: "encrypted-token",
    });

    const response = await request(app)
      .patch("/api/auth/owner-line-settings")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        enabled: true,
        notifyOnSalePaid: true,
        recipientType: "USER",
        recipientId: "C1234567890abcdef1234567890abcdef",
      });

    expect(response.status).toBe(400);
    expect(prisma.storeLineIntegration.upsert).not.toHaveBeenCalled();
  });

  test("does not allow LINE notifications to stay enabled while clearing the token", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.storeLineIntegration.findUnique.mockResolvedValue({
      id: "line-1",
      storeId: "store-1",
      channelAccessTokenEncrypted: "encrypted-token",
    });

    const response = await request(app)
      .patch("/api/auth/owner-line-settings")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        enabled: true,
        notifyOnSalePaid: true,
        recipientType: "USER",
        recipientId: "U1234567890abcdef1234567890abcdef",
        clearChannelAccessToken: true,
      });

    expect(response.status).toBe(400);
    expect(prisma.storeLineIntegration.upsert).not.toHaveBeenCalled();
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

});
