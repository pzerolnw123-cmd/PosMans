const express = require("express");
const { z } = require("zod");
const { requireAccess } = require("../middleware/auth");
const { requireTrustedOrigin, requireCsrf } = require("../middleware/security");
const { uploadSigningLimiter } = require("../middleware/rate-limiters");
const { createPresignedUpload, isR2Configured } = require("../lib/r2");
const { writeAuditLog } = require("../utils/audit");
const { safeTextSchema } = require("../utils/xss");

const router = express.Router();

const uploadSchema = z.object({
  fileName: safeTextSchema("fileName", 160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentLength: z.number().int().positive(),
  purpose: z.enum(["STORE_LOGO", "PAYMENT_QR", "PRODUCT_IMAGE"]),
}).strict();

function uploadPrefixForSession(session) {
  if (session.user.storeRole === "OWNER" && session.user.storeId) {
    return `stores/${session.user.storeId}/uploads`;
  }

  if (session.user.platformRole === "SUPER_ADMIN") {
    return `platform/super-admin/${session.user.id}/uploads`;
  }

  return null;
}

router.post(
  "/sign",
  uploadSigningLimiter,
  requireTrustedOrigin,
  requireCsrf,
  requireAccess({ platformRoles: ["SUPER_ADMIN"], storeRoles: ["OWNER"] }),
  async (req, res, next) => {
    try {
      const parsed = uploadSchema.parse(req.body);

      if (!isR2Configured()) {
        return res.status(503).json({ error: "ยังไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองอีกครั้งภายหลัง" });
      }

      const prefix = uploadPrefixForSession(req.session);
      if (!prefix) {
        return res.status(403).json({ error: "ไม่สามารถอัปโหลดไฟล์นี้ได้" });
      }

      const signedUpload = await createPresignedUpload(parsed, { prefix });
      await writeAuditLog({
        action: "UPLOAD_POLICY_ISSUED",
        actorUserId: req.session.user.id,
        status: "success",
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || null,
        targetType: "upload",
        targetId: signedUpload.objectKey,
        metadata: {
          scope: prefix,
          storeId: req.session.user.storeId || null,
          purpose: parsed.purpose,
          contentType: parsed.contentType,
          contentLength: parsed.contentLength,
        },
      });
      res.set("Cache-Control", "no-store");
      res.json(signedUpload);
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
