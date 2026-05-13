const { request, prisma, hashPassword, hashPin, verifyPassword, verifyPin, createPresignedUpload, isR2Configured, createApp, assertSafeHttpUrl, sanitizeRichText, buildSessionUser, buildChallenge, buildProduct, buildSaleOrder, mockOwnerSession, makeUniqueConflictError, originalEnv, installSecurityTestLifecycle } = require("./security-test-context");

describe("backend security hardening - sales and xss", () => {
  installSecurityTestLifecycle();

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
    expect(prisma.product.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        id: "product-1",
        storeId: "store-1",
        trackStock: true,
        stockQuantity: { gte: 2 },
      },
      data: {
        stockQuantity: { decrement: 2 },
      },
      select: {
        id: true,
        stockQuantity: true,
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
    expect(response.body.error).toBe("มีสินค้าบางรายการคงเหลือไม่พอ กรุณาตรวจสอบตะกร้า");
    expect(response.body.code).toBeUndefined();
    expect(prisma.saleOrder.create).not.toHaveBeenCalled();
    expect(prisma.product.updateManyAndReturn).not.toHaveBeenCalled();
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
    expect(response.body.error).toBe("ส่วนลดเกินกว่าที่ระบบอนุญาต");
    expect(response.body.code).toBeUndefined();
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
    expect(response.body.error).toBe("ภาษีหรือค่าธรรมเนียมเกินกว่าที่ระบบอนุญาต");
    expect(response.body.code).toBeUndefined();
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

  test("accepts empty sale notes and stores them as null", async () => {
    const app = createApp();
    mockOwnerSession();
    prisma.product.findMany.mockResolvedValue([buildProduct()]);

    const response = await request(app)
      .post("/api/sales")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        paymentMethod: "CASH",
        note: "   ",
        items: [{ productId: "product-1", quantity: 1 }],
      });

    expect(response.status).toBe(201);
    expect(prisma.saleOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: null,
        }),
      }),
    );
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
