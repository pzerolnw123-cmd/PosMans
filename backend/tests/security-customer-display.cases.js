const crypto = require("crypto");
const { request, prisma, createApp, installSecurityTestLifecycle, mockOwnerSession } = require("./security-test-context");

installSecurityTestLifecycle();

function hashDisplayToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

describe("customer display security", () => {
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
          name: "iPad counter",
          publicTokenHash: expect.not.stringContaining(response.body.token),
        }),
      }),
    );
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
});
