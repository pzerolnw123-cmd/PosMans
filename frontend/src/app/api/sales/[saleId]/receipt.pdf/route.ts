import { randomUUID } from "crypto";
import { getCurrentSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{ saleId: string }>;
};

type CachedReceiptPdf = {
  bytes: Uint8Array;
  fileName: string;
  saleId: string;
  userId: string;
  expiresAt: number;
};

const cacheTtlMs = 5 * 60 * 1000;
const maxPdfBytes = 1024 * 1024;
const receiptPdfCache = new Map<string, CachedReceiptPdf>();

function cleanupExpiredPdfCache() {
  const now = Date.now();
  for (const [token, entry] of receiptPdfCache) {
    if (entry.expiresAt <= now) {
      receiptPdfCache.delete(token);
    }
  }
}

function safeReceiptFileName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/[^A-Za-z0-9ก-๙_.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!normalized || normalized.length > 180 || !normalized.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  return normalized;
}

function readPdfBytes(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/=]+$/.test(value)) {
    return null;
  }

  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length <= 0 || bytes.length > maxPdfBytes) {
    return null;
  }

  return bytes;
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function requireOwnerUserId() {
  const session = await getCurrentSession();
  if (!session || session.user.storeRole !== "OWNER") {
    return null;
  }

  return session.user.id;
}

export async function POST(request: Request, context: RouteContext) {
  const userId = await requireOwnerUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { saleId } = await context.params;
  const body = (await request.json().catch(() => null)) as { fileName?: unknown; pdfBase64?: unknown } | null;
  const fileName = safeReceiptFileName(body?.fileName);
  const bytes = readPdfBytes(body?.pdfBase64);

  if (!fileName || !bytes) {
    return Response.json({ error: "Invalid receipt PDF payload" }, { status: 400 });
  }

  cleanupExpiredPdfCache();
  const token = randomUUID();
  receiptPdfCache.set(token, {
    bytes,
    fileName,
    saleId,
    userId,
    expiresAt: Date.now() + cacheTtlMs,
  });

  return Response.json({ url: `/api/sales/${encodeURIComponent(saleId)}/receipt.pdf?token=${encodeURIComponent(token)}` });
}

export async function GET(request: Request, context: RouteContext) {
  const userId = await requireOwnerUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { saleId } = await context.params;
  cleanupExpiredPdfCache();

  const token = new URL(request.url).searchParams.get("token") || "";
  const entry = receiptPdfCache.get(token);
  if (!entry || entry.userId !== userId || entry.saleId !== saleId) {
    return Response.json({ error: "Receipt PDF not found" }, { status: 404 });
  }

  const body = new ArrayBuffer(entry.bytes.byteLength);
  new Uint8Array(body).set(entry.bytes);

  return new Response(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": contentDisposition(entry.fileName),
      "cache-control": "private, no-store",
    },
  });
}
