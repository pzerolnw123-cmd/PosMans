import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";

export type PaymentMethod = "CASH" | "QR" | "CARD" | "TRANSFER" | "OTHER";

export type StoredCartItem = {
  productId: string;
  quantity: number;
  product?: {
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
    imageUrl?: string | null;
  };
};

export type CompletedSale = {
  id: string;
  code: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string | null;
  items: Array<{
    id: string;
    productId: string;
    code: string;
    name: string;
    category: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl?: string | null;
  }>;
};

export type SaleResponse = {
  sale: CompletedSale;
};

export type BillItem = {
  key: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl?: string | null;
};

export const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "เงินสด" },
  { value: "QR", label: "QR PromptPay" },
  { value: "CARD", label: "บัตร" },
  { value: "TRANSFER", label: "โอนเงิน" },
];
export const legacySalesCartStorageKey = "pos-mans-sales-cart";
export const legacyLatestSaleStorageKey = "pos-mans-latest-sale";

export function salesCartStorageKey(storeId: string) {
  return `${legacySalesCartStorageKey}:${storeId}`;
}

export function latestSaleStorageKey(storeId: string) {
  return `${legacyLatestSaleStorageKey}:${storeId}`;
}

export function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

export function promptPayRecipientOptionsLabel(type: OwnerPaymentSettingsValue["promptPayRecipientType"]) {
  if (type === "MOBILE") {
    return "เบอร์พร้อมเพย์";
  }
  if (type === "NATIONAL_ID") {
    return "เลขบัตรประชาชน";
  }
  if (type === "TAX_ID") {
    return "เลขผู้เสียภาษี/นิติบุคคล";
  }
  if (type === "STATIC_QR") {
    return "Static QR จากธนาคาร";
  }
  return "ข้อมูลบัญชีธนาคาร";
}

export function emv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function normalizePromptPayProxy(settings: OwnerPaymentSettingsValue) {
  if (settings.promptPayRecipientType === "MOBILE") {
    const id = settings.promptPayMobileId.replace(/\D/g, "");
    return { tag: "01", value: `0066${id.slice(1)}` };
  }

  if (settings.promptPayRecipientType === "NATIONAL_ID") {
    const id = settings.promptPayNationalId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  if (settings.promptPayRecipientType === "TAX_ID") {
    const id = settings.promptPayTaxId.replace(/\D/g, "");
    return { tag: "02", value: id };
  }

  return null;
}

export function createPromptPayPayload(settings: OwnerPaymentSettingsValue, amount: number) {
  const proxy = normalizePromptPayProxy(settings);
  if (!proxy) {
    return "";
  }

  const merchantAccountInfo = emv("00", "A000000677010111") + emv(proxy.tag, proxy.value);
  const amountText = Math.max(0, amount).toFixed(2);
  const payloadWithoutCrc =
    emv("00", "01") +
    emv("01", "12") +
    emv("29", merchantAccountInfo) +
    emv("53", "764") +
    emv("54", amountText) +
    emv("58", "TH") +
    "6304";

  return `${payloadWithoutCrc}${crc16Ccitt(payloadWithoutCrc)}`;
}

export function readLatestSale(storeId: string) {
  const storageKey = latestSaleStorageKey(storeId);
  const latestSaleRaw = sessionStorage.getItem(storageKey);
  if (!latestSaleRaw) {
    return null;
  }

  try {
    return JSON.parse(latestSaleRaw) as CompletedSale;
  } catch {
    sessionStorage.removeItem(storageKey);
    return null;
  }
}
