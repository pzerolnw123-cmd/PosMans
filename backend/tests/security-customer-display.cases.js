const crypto = require("crypto");
const { request, prisma, createApp, installSecurityTestLifecycle, mockOwnerSession } = require("./security-test-context");

installSecurityTestLifecycle();

function hashDisplayToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("customer display security", () => {
  beforeEach(() => {
    const { resetSseConnectionCountersForTests } = require("../src/routes/customer-display.presence");
    resetSseConnectionCountersForTests();
  });

  test("creates a display session with owner auth and csrf", async () => {
    mockOwnerSession();
    prisma.customerDisplaySession.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: "display-1",
        name: data.name,
        publicTokenHash: data.publicTokenHash,
        status: "IDLE",
        amount: 0,
        paymentMethod: null,
        qrDataUrl: null,
        message: null,
        saleCode: null,
        updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      }),
    );

    const response = await request(createApp())
      .post("/api/customer-displays")
      .set("origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ name: "iPad counter" });

    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.display.id).toBe("display-1");
    expect(prisma.customerDisplaySession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          storeId: "store-1",
          createdBySessionId: "session-1",
          name: "iPad counter",
          publicTokenHash: expect.not.stringContaining(response.body.token),
          ownerControlTokenHash: expect.not.stringContaining(response.body.controlToken),
        }),
      }),
    );
    expect(response.body.controlToken).toEqual(expect.any(String));
  });

  test("rejects public display access when token is wrong", async () => {
    prisma.customerDisplaySession.findUnique.mockResolvedValue({
      id: "display-1",
      publicTokenHash: hashDisplayToken("correct-token-value-that-is-long-enough"),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
    });

    const response = await request(createApp()).get("/api/customer-displays/display-1/state?token=wrong-token-value-that-is-long-enough");

    expect(response.status).toBe(403);
  });

  test("allows public display snapshot with matching token only", async () => {
    const token = "correct-token-value-that-is-long-enough";
    prisma.customerDisplaySession.findUnique.mockResolvedValue({
      id: "display-1",
      name: "จอลูกค้า",
      publicTokenHash: hashDisplayToken(token),
      status: "PAYMENT",
      amount: 331,
      paymentMethod: "QR",
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
    });

    const response = await request(createApp()).get(`/api/customer-displays/display-1/state?token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body.display.amount).toBe(331);
    expect(response.body.store.name).toBe("Demo Store");
  });

  test("throttles public display lastSeenAt updates when recently seen", async () => {
    const token = "correct-token-value-that-is-long-enough";
    prisma.customerDisplaySession.findUnique.mockResolvedValue({
      id: "display-1",
      name: "จอลูกค้า",
      publicTokenHash: hashDisplayToken(token),
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      lastSeenAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
    });

    const response = await request(createApp()).get(`/api/customer-displays/display-1/state?token=${token}`);

    expect(response.status).toBe(200);
    expect(prisma.customerDisplaySession.updateMany).not.toHaveBeenCalled();
  });

  test("updates public display lastSeenAt when stale", async () => {
    const token = "correct-token-value-that-is-long-enough";
    prisma.customerDisplaySession.findUnique.mockResolvedValue({
      id: "display-1",
      name: "จอลูกค้า",
      publicTokenHash: hashDisplayToken(token),
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      lastSeenAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
    });

    const response = await request(createApp()).get(`/api/customer-displays/display-1/state?token=${token}`);

    expect(response.status).toBe(200);
    expect(prisma.customerDisplaySession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "display-1" }),
        data: { lastSeenAt: expect.any(Date) },
      }),
    );
  });

  test("does not enqueue duplicate lastSeenAt updates during the public polling throttle window", async () => {
    const token = "correct-token-value-that-is-long-enough";
    prisma.customerDisplaySession.findUnique.mockResolvedValue({
      id: "display-1",
      name: "Customer Display",
      publicTokenHash: hashDisplayToken(token),
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      lastSeenAt: new Date(Date.now() - 60_000),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
    });

    await request(createApp()).get(`/api/customer-displays/display-1/state?token=${token}`);
    await request(createApp()).get(`/api/customer-displays/display-1/state?token=${token}`);

    expect(prisma.customerDisplaySession.updateMany).toHaveBeenCalledTimes(1);
  });

  test("caps SSE connections per display and per IP", () => {
    const { assertSseConnectionAllowed, registerSseConnection } = require("../src/routes/customer-display.presence");
    const unregisterDisplayConnections = Array.from({ length: 20 }, (_, index) => {
      assertSseConnectionAllowed("display-1", `10.0.0.${index}`);
      return registerSseConnection("display-1", `10.0.0.${index}`);
    });

    expect(() => assertSseConnectionAllowed("display-1", "10.0.1.1")).toThrow(/Too many customer display connections/);
    unregisterDisplayConnections.forEach((unregister) => unregister());

    const unregisterIpConnections = Array.from({ length: 10 }, (_, index) => {
      assertSseConnectionAllowed(`display-${index}`, "10.0.0.1");
      return registerSseConnection(`display-${index}`, "10.0.0.1");
    });

    expect(() => assertSseConnectionAllowed("display-11", "10.0.0.1")).toThrow(/Too many customer display connections/);
    unregisterIpConnections.forEach((unregister) => unregister());
  });

  test("rebinds an existing display to the current session when updating its state", async () => {
    mockOwnerSession();
    prisma.customerDisplaySession.findFirst.mockResolvedValue({
      id: "display-1",
      storeId: "store-1",
      revokedAt: null,
    });

    const response = await request(createApp())
      .patch("/api/customer-displays/display-1/state")
      .set("origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({ status: "PAYMENT", amount: 630, paymentMethod: "QR", qrDataUrl: "https://example.com/qr.png" });

    expect(response.status).toBe(200);
    expect(prisma.customerDisplaySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "display-1" },
        data: expect.objectContaining({
          createdBySessionId: "session-1",
          status: "PAYMENT",
          amount: 630,
          paymentMethod: "QR",
        }),
      }),
    );
  });

  test("allows owner-side revoke with control token even without auth session", async () => {
    const controlToken = "owner-control-token-value-that-is-long-enough";
    prisma.customerDisplaySession.findUnique
      .mockResolvedValueOnce({
        id: "display-1",
        ownerControlTokenHash: hashDisplayToken(controlToken),
        revokedAt: null,
      })
      .mockResolvedValueOnce({
        id: "display-1",
        publicTokenHash: hashDisplayToken("public-display-token-value-that-is-long-enough"),
        revokedAt: new Date("2026-05-06T00:00:01.000Z"),
        expiresAt: new Date(Date.now() + 60_000),
        store: { id: "store-1", name: "Demo Store", logoUrl: null, isActive: true },
      });
    prisma.customerDisplaySession.update.mockResolvedValue({
      id: "display-1",
      name: "iPad counter",
      status: "IDLE",
      amount: 0,
      paymentMethod: null,
      qrDataUrl: null,
      message: null,
      saleCode: null,
      updatedAt: new Date("2026-05-06T00:00:00.000Z"),
      revokedAt: new Date("2026-05-06T00:00:01.000Z"),
    });

    const revokeResponse = await request(createApp())
      .post("/api/customer-displays/display-1/revoke")
      .set("origin", "http://localhost:3000")
      .send({ controlToken });

    expect(revokeResponse.status).toBe(204);
    expect(prisma.customerDisplaySession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "display-1" },
        data: expect.objectContaining({
          status: "IDLE",
          revokedAt: expect.any(Date),
        }),
      }),
    );
  });

  test("redacts display tokens from handled error log paths", () => {
    const { sanitizeRequestPathForLog } = require("../src/middleware/error");

    expect(
      sanitizeRequestPathForLog({
        originalUrl: "/api/customer-displays/display-1/state?token=public-secret&ok=1&controlToken=owner-secret",
      }),
    ).toBe("/api/customer-displays/display-1/state?token=redacted&ok=1&controlToken=redacted");
  });
});
