export type ProductCategory =
  | "ทั้งหมด"
  | "อาหาร"
  | "เครื่องดื่ม"
  | "ของหวาน/ขนม"
  | "รองเท้า"
  | "อะไหล่ / อุปกรณ์เสริม";

export type ProductStatus = "พร้อมขาย" | "ปิดขาย";

export type ProductItem = {
  id: string;
  code: string;
  name: string;
  category: Exclude<ProductCategory, "ทั้งหมด">;
  price: number;
  costPerUnit: number;
  status: ProductStatus;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number;
  imageUrl?: string;
  uploadedKey?: string;
};

export type CropDraft = {
  fileName: string;
  objectUrl: string;
  image: HTMLImageElement;
};

export type ProductListResponse = {
  products: ProductItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type SignedUploadPayload = {
  objectKey: string;
  maxUploadBytes: number;
  publicUrl: string | null;
  upload: {
    method: "PUT" | "POST";
    url: string;
    headers?: Record<string, string>;
    fields?: Record<string, string>;
  };
};

export const categoryOptions: ProductCategory[] = [
  "ทั้งหมด",
  "อาหาร",
  "เครื่องดื่ม",
  "ของหวาน/ขนม",
  "รองเท้า",
  "อะไหล่ / อุปกรณ์เสริม",
];

export function makeNewProduct(): ProductItem {
  return {
    id: `draft-${Date.now()}`,
    code: "DRAFT-NEW",
    name: "",
    category: "อาหาร",
    price: 0,
    costPerUnit: 0,
    status: "พร้อมขาย",
    trackStock: false,
    stockQuantity: 0,
    lowStockThreshold: 0,
  };
}

export function isDraftProduct(product: ProductItem) {
  return product.id.startsWith("draft-") || product.code === "DRAFT-NEW";
}

export function formatPrice(value: number) {
  return `THB ${value}`;
}
