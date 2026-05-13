const { request, prisma, hashPassword, hashPin, verifyPassword, verifyPin, createPresignedUpload, deleteR2Object, isR2Configured, createApp, assertSafeHttpUrl, sanitizeRichText, buildSessionUser, buildChallenge, buildProduct, buildSaleOrder, mockOwnerSession, makeUniqueConflictError, originalEnv, installSecurityTestLifecycle } = require("./security-test-context");

describe("backend security hardening - products", () => {
  installSecurityTestLifecycle();

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

  test("keeps product update successful when replaced upload cleanup fails", async () => {
    const app = createApp();
    mockOwnerSession();
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    prisma.product.findFirst.mockResolvedValue({
      id: "product-1",
      uploadedKey: "stores/store-1/uploads/old.webp",
      trackStock: false,
      stockQuantity: 0,
      lowStockThreshold: 0,
    });
    prisma.product.update.mockResolvedValue(buildProduct({
      imageUrl: "https://cdn.example.com/stores/store-1/uploads/new.webp",
      uploadedKey: "stores/store-1/uploads/new.webp",
    }));
    deleteR2Object.mockRejectedValue(new Error("R2 delete failed"));

    const response = await request(app)
      .patch("/api/products/product-1")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", ["pos_mans_session=session-token", "pos_mans_session_csrf=csrf-token"])
      .set("x-csrf-token", "csrf-token")
      .send({
        imageUrl: "https://cdn.example.com/stores/store-1/uploads/new.webp",
        uploadedKey: "stores/store-1/uploads/new.webp",
      });

    expect(response.status).toBe(200);
    expect(deleteR2Object).toHaveBeenCalledWith("stores/store-1/uploads/old.webp");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: "PRODUCT_UPDATED",
        status: "success",
      }),
    }));
    consoleErrorSpy.mockRestore();
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

});
