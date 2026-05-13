import { randomUUID } from "crypto";
import { getCurrentSession } from "@/lib/session";
import { enforceMaxEntries, pruneExpiredEntries, sumByteLengths } from "@/lib/cache-limits";

export type CachedPdf = {
  bytes: Uint8Array;
  fileName: string;
  ownerKey: string;
  expiresAt: number;
};

const cacheTtlMs = 5 * 60 * 1000;
const maxPdfBytes = 2 * 1024 * 1024;
const maxCachedPdfs = 50;
const maxCachedPdfBytes = 20 * 1024 * 1024;
const pdfCache = new Map<string, CachedPdf>();

export function cleanupExpiredPdfCache() {
  pruneExpiredEntries(pdfCache);
}

function cachedPdfByteTotal() {
  return sumByteLengths(pdfCache.values(), (entry) => entry.bytes.byteLength);
}

function enforcePdfCacheLimits() {
  enforceMaxEntries(pdfCache, maxCachedPdfs);
  while (pdfCache.size > maxCachedPdfs || cachedPdfByteTotal() > maxCachedPdfBytes) {
    const oldestToken = pdfCache.keys().next().value;
    if (!oldestToken) {
      return;
    }
    pdfCache.delete(oldestToken);
  }
}

export function safePdfFileName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/[^A-Za-z0-9ก-๙_.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!normalized || normalized.length > 180 || !normalized.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  return normalized;
}

export function readPdfBytes(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/=]+$/.test(value)) {
    return null;
  }

  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length <= 0 || bytes.length > maxPdfBytes) {
    return null;
  }

  return bytes;
}

export function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function requireOwnerUserId() {
  const session = await getCurrentSession();
  if (!session || session.user.storeRole !== "OWNER") {
    return null;
  }

  return session.user.id;
}

export function cachePdf(entry: Omit<CachedPdf, "expiresAt">) {
  cleanupExpiredPdfCache();
  const token = randomUUID();
  pdfCache.set(token, {
    ...entry,
    expiresAt: Date.now() + cacheTtlMs,
  });
  enforcePdfCacheLimits();
  return token;
}

export function getCachedPdf(token: string) {
  cleanupExpiredPdfCache();
  return pdfCache.get(token);
}

export function deleteCachedPdf(token: string) {
  pdfCache.delete(token);
}

export function getPdfCacheStats() {
  cleanupExpiredPdfCache();
  return {
    entries: pdfCache.size,
    totalBytes: cachedPdfByteTotal(),
  };
}
