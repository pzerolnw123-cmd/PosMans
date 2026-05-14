import type { OwnerPaymentSettingsValue } from "@/components/owner-settings-client";
import { formatBaht as formatSharedBaht } from "../../lib/format";
import { checkoutPaymentMethods, type PaymentMethod } from "../../lib/payment-methods";

export type { PaymentMethod };

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

export const paymentMethods = checkoutPaymentMethods;
export const legacySalesCartStorageKey = "pos-mans-sales-cart";
export const legacyLatestSaleStorageKey = "pos-mans-latest-sale";

export function salesCartStorageKey(storeId: string) {
  return `${legacySalesCartStorageKey}:${storeId}`;
}

export function latestSaleStorageKey(storeId: string) {
  return `${legacyLatestSaleStorageKey}:${storeId}`;
}

export function formatBaht(value: number) {
  return formatSharedBaht(value);
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

export { crc16Ccitt, createPromptPayPayload, emv, normalizePromptPayProxy } from "./promptpay";

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
