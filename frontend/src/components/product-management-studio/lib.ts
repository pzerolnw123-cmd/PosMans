import { csrfCookieName, ensureCsrfToken, readCookie } from "@/lib/csrf";
import type { CropDraft, ProductListResponse, SignedUploadPayload } from "@/components/product-management-studio/types";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CROP_VIEWPORT_SIZE = 320;
const CROPPED_EXPORT_SIZE = 1200;
const PRODUCT_LIST_CACHE_TTL_MS = 15_000;
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
    const csrfToken = (await ensureCsrfToken()) || readCookie(csrfCookieName);
    if (!csrfToken) {
      throw new Error("ไม่สามารถเริ่มต้น CSRF token ได้");
    }

    headers.set("x-csrf-token", csrfToken);
    headers.set("content-type", headers.get("content-type") || "application/json");
  }

  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; product?: T; products?: T; pagination?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error || "เกิดข้อผิดพลาดในการเชื่อมต่อสินค้า");
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

export function invalidateProductListCache() {
  productListCache.clear();
}

export async function requestProductList(params: URLSearchParams, { force = false }: { force?: boolean } = {}) {
  const cacheKey = params.toString();
  const cached = productListCache.get(cacheKey);

  if (!force && cached && cached.expiresAt > Date.now()) {
    return cloneProductListResponse(cached.payload);
  }

  const payload = await requestJson<ProductListResponse>(`/api/products?${cacheKey}`);
  productListCache.set(cacheKey, {
    expiresAt: Date.now() + PRODUCT_LIST_CACHE_TTL_MS,
    payload: cloneProductListResponse(payload),
  });

  return payload;
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
  const baseScale = Math.max(viewportSize / image.width, viewportSize / image.height);
  const renderWidth = image.width * baseScale * zoom;
  const renderHeight = image.height * baseScale * zoom;

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

  context.fillStyle = "#0f1420";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  const baseScale = Math.max(canvas.width / draft.image.width, canvas.height / draft.image.height);
  const drawWidth = draft.image.width * baseScale * zoom;
  const drawHeight = draft.image.height * baseScale * zoom;
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
  const csrfToken = (await ensureCsrfToken()) || readCookie(csrfCookieName);
  if (!csrfToken) {
    throw new Error("ไม่สามารถเริ่มต้น CSRF token ได้");
  }

  const response = await fetch("/api/uploads/sign", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
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
      throw new Error("อัปโหลดไปที่ R2 ไม่ได้เพราะ CORS ของ bucket ยังไม่อนุญาต localhost:3000");
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error("อัปโหลดไฟล์ไปที่ R2 ไม่สำเร็จ");
  }
}
