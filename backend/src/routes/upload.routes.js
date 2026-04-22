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
  contentType: z.string().min(1).max(120),
  contentLength: z.number().int().positive(),
});

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
        return res.status(503).json({ error: "R2 is not configured" });
      }

      const prefix = uploadPrefixForSession(req.session);
      if (!prefix) {
        return res.status(403).json({ error: "Upload scope is required" });
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
