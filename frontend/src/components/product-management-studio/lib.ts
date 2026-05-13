import { fetchWithCsrfRetry } from "@/lib/csrf";
import { enforceMaxEntries, pruneExpiredEntries } from "@/lib/cache-limits";
import type { CropDraft, ProductListResponse, SignedUploadPayload } from "@/components/product-management-studio/types";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CROP_VIEWPORT_SIZE = 320;
const CROPPED_EXPORT_SIZE = 1200;
const PRODUCT_LIST_CACHE_TTL_MS = 15_000;
const PRODUCT_LIST_CACHE_MAX_ENTRIES = 40;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const productListCache = new Map<string, { expiresAt: number; payload: ProductListResponse }>();

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function revokeManagedObjectUrl(url: string | undefined, managedUrls: string[]) {
  if (!url || !url.startsWith("blob:")) {
    return managedUrls;
  }

  URL.revokeObjectURL(url);
  return managedUrls.filter((entry) => entry !== url);
}

export async function requestJson<T>(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);

  if (init?.method && init.method !== "GET") {
    headers.set("content-type", headers.get("content-type") || "application/json");
  }

  const response = await fetchWithCsrfRetry(path, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: string; details?: unknown; product?: T; products?: T; pagination?: unknown }
    | null;

  if (!response.ok) {
    const error = new Error(payload?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อสินค้า");
    if (payload?.code) {
      (error as Error & { code?: string }).code = payload.code;
    }
    if (payload?.details) {
      (error as Error & { details?: unknown }).details = payload.details;
    }
    throw error;
  }

  if (payload?.pagination) {
    return payload as T;
  }

  return (payload?.product ?? payload?.products ?? payload) as T;
}

function cloneProductListResponse(payload: ProductListResponse): ProductListResponse {
  return {
    products: payload.products.map((product) => ({ ...product })),
    pagination: { ...payload.pagination },
  };
}

function pruneProductListCache() {
  pruneExpiredEntries(productListCache);
  enforceMaxEntries(productListCache, PRODUCT_LIST_CACHE_MAX_ENTRIES);
}

export function invalidateProductListCache() {
  productListCache.clear();
}

export function getProductListCacheStats() {
  pruneProductListCache();
  return {
    entries: productListCache.size,
  };
}

export async function requestProductList(params: URLSearchParams, { force = false }: { force?: boolean } = {}) {
  pruneProductListCache();
  const cacheKey = params.toString();
  const cached = productListCache.get(cacheKey);

  if (!force && cached && cached.expiresAt > Date.now()) {
    productListCache.delete(cacheKey);
    productListCache.set(cacheKey, cached);
    return cloneProductListResponse(cached.payload);
  }

  const payload = await requestJson<ProductListResponse>(`/api/products?${cacheKey}`);
  productListCache.set(cacheKey, {
    expiresAt: Date.now() + PRODUCT_LIST_CACHE_TTL_MS,
    payload: cloneProductListResponse(payload),
  });
  pruneProductListCache();

  return payload;
}

export async function loadAllProducts() {
  const pageSize = 50;
  const firstParams = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
  const firstPage = await requestProductList(firstParams, { force: true });
  const allProducts = [...firstPage.products];

  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    const response = await requestProductList(params, { force: true });
    allProducts.push(...response.products);
  }

  return allProducts;
}

export function createImageObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ไม่สามารถโหลดรูปภาพสำหรับคร็อบได้"));
    image.src = src;
  });
}

export function buildCropMetrics(image: HTMLImageElement, zoom: number, viewportSize: number) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const baseScale = Math.min(viewportSize / sourceWidth, viewportSize / sourceHeight);
  const renderWidth = sourceWidth * baseScale * zoom;
  const renderHeight = sourceHeight * baseScale * zoom;

  return {
    renderWidth,
    renderHeight,
    maxOffsetX: Math.max(0, (renderWidth - viewportSize) / 2),
    maxOffsetY: Math.max(0, (renderHeight - viewportSize) / 2),
  };
}

export function clampOffset(
  image: HTMLImageElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
  viewportSize: number,
) {
  const metrics = buildCropMetrics(image, zoom, viewportSize);

  return {
    x: clamp(offsetX, -metrics.maxOffsetX, metrics.maxOffsetX),
    y: clamp(offsetY, -metrics.maxOffsetY, metrics.maxOffsetY),
  };
}

export async function createCroppedBlob(draft: CropDraft, zoom: number, offsetX: number, offsetY: number) {
  const canvas = document.createElement("canvas");
  canvas.width = CROPPED_EXPORT_SIZE;
  canvas.height = CROPPED_EXPORT_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("ไม่สามารถสร้าง canvas สำหรับคร็อบรูปได้");
  }

  const matteColor =
    typeof document === "undefined"
      ? "Canvas"
      : getComputedStyle(document.documentElement).getPropertyValue("--image-placeholder").trim() || "Canvas";
  context.fillStyle = matteColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const sourceWidth = draft.image.naturalWidth || draft.image.width;
  const sourceHeight = draft.image.naturalHeight || draft.image.height;
  const baseScale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
  const drawWidth = sourceWidth * baseScale * zoom;
  const drawHeight = sourceHeight * baseScale * zoom;
  const offsetScale = CROPPED_EXPORT_SIZE / CROP_VIEWPORT_SIZE;
  const drawX = (canvas.width - drawWidth) / 2 + offsetX * offsetScale;
  const drawY = (canvas.height - drawHeight) / 2 + offsetY * offsetScale;

  context.drawImage(draft.image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.92);
  });

  if (!blob) {
    throw new Error("ไม่สามารถสร้างไฟล์รูปภาพหลังคร็อบได้");
  }

  return blob;
}

export async function requestSignedUpload(fileName: string, contentType: string, contentLength: number, purpose: "STORE_LOGO" | "PAYMENT_QR" | "PRODUCT_IMAGE") {
  const response = await fetchWithCsrfRetry("/api/uploads/sign", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ fileName, contentType, contentLength, purpose }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || "ไม่สามารถขอสิทธิ์อัปโหลดไฟล์ได้");
  }

  return (await response.json()) as SignedUploadPayload;
}

export async function uploadBlobToR2(payload: SignedUploadPayload, blob: Blob) {
  let response: Response;

  try {
    if (payload.upload.method === "POST") {
      const formData = new FormData();
      for (const [key, value] of Object.entries(payload.upload.fields || {})) {
        formData.append(key, value);
      }
      formData.append("file", blob);

      response = await fetch(payload.upload.url, {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch(payload.upload.url, {
        method: payload.upload.method,
        headers: payload.upload.headers,
        body: blob,
      });
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองอีกครั้ง");
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error("อัปโหลดไฟล์ไม่สำเร็จ");
  }
}
