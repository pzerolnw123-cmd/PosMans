import { cachePdf, contentDisposition, getCachedPdf, readPdfBytes, requireOwnerUserId, safePdfFileName } from "@/lib/pdf-cache";

export async function POST(request: Request) {
  const userId = await requireOwnerUserId();
  if (!userId) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { fileName?: unknown; pdfBase64?: unknown } | null;
  const fileName = safePdfFileName(body?.fileName);
  const bytes = readPdfBytes(body?.pdfBase64);

  if (!fileName || !bytes) {
    return Response.json({ error: "ไม่สามารถเตรียมไฟล์รายงานได้" }, { status: 400 });
  }

  const token = cachePdf({
    bytes,
    fileName,
    ownerKey: userId,
  });

  return Response.json({ url: `/api/reports/profit.pdf?token=${encodeURIComponent(token)}` });
}

export async function GET(request: Request) {
  const userId = await requireOwnerUserId();
  if (!userId) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบอีกครั้ง" }, { status: 401 });
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  const entry = getCachedPdf(token);
  if (!entry || entry.ownerKey !== userId) {
    return Response.json({ error: "ไม่พบไฟล์รายงาน กรุณาสร้างใหม่อีกครั้ง" }, { status: 404 });
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
