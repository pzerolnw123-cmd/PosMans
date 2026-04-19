export type ProductCategory =
  | "ทั้งหมด"
  | "อาหาร"
  | "เครื่องดื่ม"
  | "ของหวาน/ขนม"
  | "รองเท้า"
  | "อะไหล่ / อุปกรณ์เสริม";

export type ProductStatus = "พร้อมขาย" | "ใกล้หมด";

export type ProductItem = {
  id: string;
  code: string;
  name: string;
  category: Exclude<ProductCategory, "ทั้งหมด">;
  price: number;
  status: ProductStatus;
  imageUrl?: string;
  uploadedKey?: string;
};

export type CropDraft = {
  fileName: string;
  dataUrl: string;
  image: HTMLImageElement;
};

export type SignedUploadPayload = {
  objectKey: string;
  maxUploadBytes: number;
  publicUrl: string | null;
  upload: {
    method: "PUT";
    url: string;
    headers: Record<string, string>;
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
    status: "พร้อมขาย",
  };
}

export function isDraftProduct(product: ProductItem) {
  return product.id.startsWith("draft-") || product.code === "DRAFT-NEW";
}

export function formatPrice(value: number) {
  return `THB ${value}`;
}
