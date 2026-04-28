const { prisma } = require("../lib/db");
const { writeAuditLog } = require("../utils/audit");
const { requireStoreRole } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { deleteR2Object } = require("../lib/r2");
const {
  ownerProfileSchema,
  ownerThemeSchema,
  ownerPaymentSettingsSchema,
  ownerLogoSchema,
  storePaymentSelect,
  assertOwnedUploadedKey,
  assertUrlMatchesUploadedKey,
} = require("./auth.route-helpers");

function registerOwnerSettingsRoutes(router) {
router.get("/owner-payment-settings", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = req.session.user.storeId;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: storePaymentSelect,
    });

    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    res.set("Cache-Control", "no-store");
    res.json({ store });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-profile", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerProfileSchema.parse(req.body);
    const storeId = req.session.user.storeId;

    const [store, user] = await prisma.$transaction([
      prisma.store.update({
        where: { id: storeId },
        data: { name: parsed.storeName },
        select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
      }),
      prisma.user.update({
        where: { id: req.session.user.id },
        data: { displayName: parsed.ownerName },
        select: { id: true, displayName: true, ownerTheme: true },
      }),
    ]);

    await writeAuditLog({
      action: "STORE_PROFILE_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: { storeName: store.name, ownerUserId: user.id },
    });

    res.set("Cache-Control", "no-store");
    res.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        ownerTheme: user.ownerTheme,
        store,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-theme", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerThemeSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.session.user.id },
      data: { ownerTheme: parsed.theme },
      select: { id: true, ownerTheme: true, storeId: true },
    });

    await writeAuditLog({
      action: "STORE_PROFILE_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "user",
      targetId: user.id,
      metadata: { ownerTheme: user.ownerTheme, storeId: user.storeId },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-logo", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerLogoSchema.parse(req.body);
    const storeId = req.session.user.storeId;
    assertOwnedUploadedKey(storeId, parsed.uploadedKey);
    assertUrlMatchesUploadedKey(parsed.uploadedKey, parsed.logoUrl);

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, logoUploadedKey: true },
    });

    if (!existingStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        logoUrl: parsed.logoUrl,
        logoUploadedKey: parsed.uploadedKey,
      },
      select: { id: true, name: true, slug: true, logoUrl: true, logoUploadedKey: true },
    });

    if (existingStore.logoUploadedKey && existingStore.logoUploadedKey !== parsed.uploadedKey) {
      await deleteR2Object(existingStore.logoUploadedKey);
    }

    await writeAuditLog({
      action: "STORE_LOGO_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: { uploadedKey: parsed.uploadedKey },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, store });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-payment-settings", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerPaymentSettingsSchema.parse(req.body);
    const storeId = req.session.user.storeId;

    if (parsed.paymentQrUploadedKey) {
      assertOwnedUploadedKey(storeId, parsed.paymentQrUploadedKey);
    }

    if (parsed.paymentQrUploadedKey && parsed.paymentQrImageUrl) {
      assertUrlMatchesUploadedKey(parsed.paymentQrUploadedKey, parsed.paymentQrImageUrl);
    }

    const existingStore = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, paymentQrUploadedKey: true },
    });

    if (!existingStore) {
      return res.status(404).json({ error: "Store not found" });
    }

    const shouldRemoveQr = existingStore.paymentQrUploadedKey && existingStore.paymentQrUploadedKey !== parsed.paymentQrUploadedKey;
    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        promptPayEnabled: parsed.promptPayEnabled,
        promptPayRecipientType: parsed.promptPayRecipientType,
        promptPayId:
          parsed.promptPayRecipientType === "MOBILE"
            ? parsed.promptPayMobileId
            : parsed.promptPayRecipientType === "NATIONAL_ID"
              ? parsed.promptPayNationalId
              : parsed.promptPayRecipientType === "TAX_ID"
                ? parsed.promptPayTaxId
                : null,
        promptPayMobileId: parsed.promptPayMobileId,
        promptPayNationalId: parsed.promptPayNationalId,
        promptPayTaxId: parsed.promptPayTaxId,
        bankName: parsed.bankName,
        bankAccountName: parsed.bankAccountName,
        bankAccountNumber: parsed.bankAccountNumber,
        paymentQrImageUrl: parsed.paymentQrImageUrl,
        paymentQrUploadedKey: parsed.paymentQrUploadedKey,
      },
      select: storePaymentSelect,
    });

    if (shouldRemoveQr) {
      await deleteR2Object(existingStore.paymentQrUploadedKey);
    }

    await writeAuditLog({
      action: "STORE_PAYMENT_SETTINGS_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "store",
      targetId: storeId,
      metadata: {
        promptPayEnabled: store.promptPayEnabled,
        promptPayRecipientType: store.promptPayRecipientType,
        hasPromptPayMobileId: Boolean(store.promptPayMobileId),
        hasPromptPayNationalId: Boolean(store.promptPayNationalId),
        hasPromptPayTaxId: Boolean(store.promptPayTaxId),
        hasBankAccount: Boolean(store.bankAccountNumber),
        hasStaticQr: Boolean(store.paymentQrUploadedKey),
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, store });
  } catch (error) {
    next(error);
  }
});

}

module.exports = { registerOwnerSettingsRoutes };
