const { prisma } = require("../lib/db");
const { writeAuditLog } = require("../utils/audit");
const { requireStoreRole } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { lineTestLimiter } = require("../middleware/rate-limiters");
const { pushLineTextMessage } = require("../lib/line");
const { deleteR2Object } = require("../lib/r2");
const { getStorePlanSummary } = require("../lib/plan-policy");
const { publishStoreEvent } = require("../utils/customer-display-events");
const { encryptSecret, secretHint } = require("../utils/secret-box");
const {
  ownerLineSettingsSchema,
  ownerProfileSchema,
  ownerThemeSchema,
  ownerPaymentSettingsSchema,
  ownerLogoSchema,
  storePaymentSelect,
  assertOwnedUploadedKey,
  assertUrlMatchesUploadedKey,
} = require("./auth.route-helpers");

async function broadcastStoreThemeToCustomerDisplays(storeId, ownerTheme) {
  if (!storeId) {
    return;
  }

  await publishStoreEvent(storeId, "store", { ownerTheme });
}

function serializeLineIntegration(integration) {
  return {
    enabled: Boolean(integration?.enabled),
    notifyOnSalePaid: integration?.notifyOnSalePaid ?? true,
    recipientType: integration?.recipientType || "USER",
    recipientId: integration?.recipientId || "",
    hasChannelAccessToken: Boolean(integration?.channelAccessTokenEncrypted),
    channelAccessTokenHint: integration?.channelAccessTokenHint || null,
    lastTestedAt: integration?.lastTestedAt || null,
    lastSuccessAt: integration?.lastSuccessAt || null,
    lastError: integration?.lastError || null,
  };
}

async function findOwnerLineIntegration(storeId) {
  return prisma.storeLineIntegration.findUnique({ where: { storeId } });
}

function registerOwnerSettingsRoutes(router) {
router.get("/owner-plan", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = req.session.user.storeId;
    const plan = await getStorePlanSummary(prisma, storeId);
    res.set("Cache-Control", "no-store");
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

router.get("/owner-line-settings", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const integration = await findOwnerLineIntegration(req.session.user.storeId);
    res.set("Cache-Control", "no-store");
    res.json({ line: serializeLineIntegration(integration) });
  } catch (error) {
    next(error);
  }
});

router.get("/owner-payment-settings", requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = req.session.user.storeId;
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: storePaymentSelect,
    });

    if (!store) {
      return res.status(404).json({ error: "ไม่พบข้อมูลร้าน" });
    }

    res.set("Cache-Control", "no-store");
    res.json({ store });
  } catch (error) {
    next(error);
  }
});

router.patch("/owner-line-settings", requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const parsed = ownerLineSettingsSchema.parse(req.body);
    const storeId = req.session.user.storeId;
    const existingIntegration = await findOwnerLineIntegration(storeId);

    const hasUsableTokenAfterSave = !parsed.clearChannelAccessToken && Boolean(parsed.channelAccessToken || existingIntegration?.channelAccessTokenEncrypted);
    if (parsed.enabled && !hasUsableTokenAfterSave) {
      return res.status(400).json({ error: "กรอก Channel access token ก่อนเปิดแจ้งเตือน LINE OA" });
    }

    const tokenUpdate = parsed.clearChannelAccessToken
      ? {
          channelAccessTokenEncrypted: null,
          channelAccessTokenHint: null,
        }
      : parsed.channelAccessToken
        ? {
            channelAccessTokenEncrypted: encryptSecret(parsed.channelAccessToken),
            channelAccessTokenHint: secretHint(parsed.channelAccessToken),
          }
        : {};

    const integration = await prisma.storeLineIntegration.upsert({
      where: { storeId },
      create: {
        storeId,
        enabled: parsed.enabled,
        notifyOnSalePaid: parsed.notifyOnSalePaid,
        recipientType: parsed.recipientType,
        recipientId: parsed.recipientId || null,
        ...tokenUpdate,
      },
      update: {
        enabled: parsed.enabled,
        notifyOnSalePaid: parsed.notifyOnSalePaid,
        recipientType: parsed.recipientType,
        recipientId: parsed.recipientId || null,
        lastError: null,
        ...tokenUpdate,
      },
    });

    await writeAuditLog({
      action: "STORE_LINE_SETTINGS_UPDATED",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "storeLineIntegration",
      targetId: integration.id,
      metadata: {
        storeId,
        enabled: integration.enabled,
        notifyOnSalePaid: integration.notifyOnSalePaid,
        recipientType: integration.recipientType,
        hasRecipientId: Boolean(integration.recipientId),
        tokenChanged: Boolean(parsed.channelAccessToken || parsed.clearChannelAccessToken),
      },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, line: serializeLineIntegration(integration) });
  } catch (error) {
    next(error);
  }
});

router.post("/owner-line-settings/test", lineTestLimiter, requireTrustedOrigin, requireCsrf, requireStoreRole(["OWNER"]), async (req, res, next) => {
  try {
    const storeId = req.session.user.storeId;
    const integration = await findOwnerLineIntegration(storeId);
    if (!integration?.channelAccessTokenEncrypted || !integration.recipientId) {
      return res.status(400).json({ error: "ตั้งค่า LINE OA ให้ครบก่อนส่งข้อความทดสอบ" });
    }

    await pushLineTextMessage(integration, "ทดสอบแจ้งเตือนจาก POS MANS\nLINE OA ของร้านเชื่อมต่อสำเร็จแล้ว");
    const updatedIntegration = await prisma.storeLineIntegration.update({
      where: { storeId },
      data: {
        lastTestedAt: new Date(),
        lastSuccessAt: new Date(),
        lastError: null,
      },
    });

    await writeAuditLog({
      action: "STORE_LINE_TEST_SENT",
      actorUserId: req.session.user.id,
      status: "success",
      ipAddress: req.ip,
      userAgent: req.get("user-agent") || null,
      targetType: "storeLineIntegration",
      targetId: updatedIntegration.id,
      metadata: { storeId, recipientType: updatedIntegration.recipientType },
    });

    res.set("Cache-Control", "no-store");
    res.json({ success: true, line: serializeLineIntegration(updatedIntegration) });
  } catch (error) {
    const storeId = req.session?.user?.storeId;
    if (storeId) {
      await prisma.storeLineIntegration
        .update({
          where: { storeId },
          data: {
            lastTestedAt: new Date(),
            lastError: error?.message ? String(error.message).slice(0, 500) : "LINE test failed",
          },
        })
        .catch(() => undefined);
    }
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

    await broadcastStoreThemeToCustomerDisplays(user.storeId, user.ownerTheme);

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
      return res.status(404).json({ error: "ไม่พบข้อมูลร้าน" });
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
      return res.status(404).json({ error: "ไม่พบข้อมูลร้าน" });
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
