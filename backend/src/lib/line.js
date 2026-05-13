const { AppError } = require("../utils/app-error");
const { decryptSecret } = require("../utils/secret-box");

const linePushEndpoint = "https://api.line.me/v2/bot/message/push";
const maxLineErrorLength = 500;

function parseLineErrorMessage(payload) {
  if (!payload) {
    return "";
  }

  try {
    const parsed = JSON.parse(payload);
    return typeof parsed?.message === "string" ? parsed.message : "";
  } catch {
    return "";
  }
}

function getLinePushErrorMessage(status, payload) {
  const lineMessage = parseLineErrorMessage(payload);
  if (status === 401 || /access token|authorization/i.test(lineMessage)) {
    return "ส่ง LINE OA ไม่สำเร็จ: Channel access token ไม่ถูกต้องหรือหมดอายุ";
  }

  if (status === 400) {
    return "ส่ง LINE OA ไม่สำเร็จ: ตรวจสอบ Recipient ID และปลายทางแจ้งเตือน";
  }

  if (status === 403) {
    return "ส่ง LINE OA ไม่สำเร็จ: token นี้ไม่มีสิทธิ์ส่งข้อความ";
  }

  if (status === 429) {
    return "ส่ง LINE OA ไม่สำเร็จ: ส่งข้อความถี่เกินไป กรุณาลองใหม่อีกครั้ง";
  }

  return truncateLineError(lineMessage || payload || `LINE API returned ${status}`);
}

function truncateLineError(message) {
  if (!message) {
    return "LINE notification failed";
  }

  return String(message).slice(0, maxLineErrorLength);
}

function assertLineIntegrationReady(integration) {
  if (!integration?.channelAccessTokenEncrypted || !integration.recipientId) {
    throw new AppError("LINE OA ยังตั้งค่าไม่ครบ", 400, { code: "LINE_NOT_CONFIGURED" });
  }
}

function buildSaleLineMessage(order) {
  const itemCount = order.items?.reduce((count, item) => count + item.quantity, 0) || 0;
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const timeText = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(createdAt);

  return [
    "ขายสำเร็จ",
    `เลขบิล: ${order.code}`,
    `ยอดรวม: ฿${Number(order.total || 0).toLocaleString("th-TH")}`,
    `วิธีชำระเงิน: ${order.paymentMethod}`,
    `จำนวนสินค้า: ${itemCount}`,
    `เวลา: ${timeText}`,
  ].join("\n");
}

async function pushLineTextMessage(integration, text) {
  assertLineIntegrationReady(integration);
  const token = decryptSecret(integration.channelAccessTokenEncrypted);
  if (!token) {
    throw new AppError("LINE OA token ไม่สามารถอ่านได้", 400, { code: "LINE_TOKEN_UNREADABLE" });
  }

  const response = await fetch(linePushEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: integration.recipientId,
      messages: [{ type: "text", text }],
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new AppError(getLinePushErrorMessage(response.status, payload), response.status >= 500 ? 502 : 400, {
      code: "LINE_PUSH_FAILED",
    });
  }

  return { success: true };
}

module.exports = {
  buildSaleLineMessage,
  getLinePushErrorMessage,
  pushLineTextMessage,
  truncateLineError,
};
