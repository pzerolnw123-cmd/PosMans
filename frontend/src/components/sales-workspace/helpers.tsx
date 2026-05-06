import type { ProductCategory, ProductItem } from "@/components/product-management-studio/types";

export const salesCartStorageKey = "pos-mans-sales-cart";

export function CategoryIcon({ category }: { category: ProductCategory }) {
  if (category === "อาหาร") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
        <path fill="currentColor" d="M4.67 2c-.624 0-1.175.438-1.29 1.068C3.232 3.886 3 5.342 3 6.5c0 1.231.636 2.313 1.595 2.936c.271.177.405.405.405.6v.41q0 .027-.003.054c-.027.26-.151 1.429-.268 2.631C4.614 14.316 4.5 15.581 4.5 16a2 2 0 1 0 4 0c0-.42-.114-1.684-.229-2.869a302 302 0 0 0-.268-2.63L8 10.446v-.41c0-.196.134-.424.405-.6A3.5 3.5 0 0 0 10 6.5c0-1.158-.232-2.614-.38-3.432A1.305 1.305 0 0 0 8.33 2c-.34 0-.65.127-.884.336A1.5 1.5 0 0 0 6.5 2c-.359 0-.688.126-.946.336A1.32 1.32 0 0 0 4.671 2M6 3.5a.5.5 0 0 1 1 0v3a.5.5 0 0 0 1 0V3.33A.33.33 0 0 1 8.33 3c.157 0 .28.108.306.247C8.783 4.06 9 5.439 9 6.5a2.5 2.5 0 0 1-1.14 2.098c-.439.285-.86.786-.86 1.438v.41q0 .08.008.16c.028.258.151 1.424.268 2.622c.118 1.215.224 2.415.224 2.772a1 1 0 1 1-2 0c0-.357.106-1.557.224-2.772c.117-1.198.24-2.364.268-2.622q.008-.08.008-.16v-.41c0-.652-.421-1.153-.86-1.438A2.5 2.5 0 0 1 4 6.5c0-1.06.217-2.44.364-3.253A.305.305 0 0 1 4.671 3A.33.33 0 0 1 5 3.33V6.5a.5.5 0 0 0 1 0zm5 3A4.5 4.5 0 0 1 15.5 2a.5.5 0 0 1 .5.5v6.978l.02.224a626 626 0 0 1 .228 2.696c.124 1.507.252 3.161.252 3.602a2 2 0 1 1-4 0c0-.44.128-2.095.252-3.602c.062-.761.125-1.497.172-2.042l.03-.356H12.5A1.5 1.5 0 0 1 11 8.5zm2.998 3.044l-.021.245l-.057.653c-.047.544-.11 1.278-.172 2.038c-.126 1.537-.248 3.132-.248 3.52a1 1 0 1 0 2 0c0-.388-.122-1.983-.248-3.52a565 565 0 0 0-.229-2.691l-.021-.244v-.001L15 9.5V3.035A3.5 3.5 0 0 0 12 6.5v2a.5.5 0 0 0 .5.5h1a.5.5 0 0 1 .498.544" />
      </svg>
    );
  }

  if (category === "เครื่องดื่ม") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M7 22a2 2 0 0 1-2-1.84L4 7h13l-1 13.16A2 2 0 0 1 14 22zm-.08-2h7.16L14.92 9H6.08zM18 7h1.5a2.5 2.5 0 0 1 0 5H18v-2h1.5a.5.5 0 0 0 0-1H18zM3 4h15v2H3zm5-3h2v2H8zm4 0h2v2h-2z" />
      </svg>
    );
  }

  if (category === "ของหวาน/ขนม") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M7 22a2 2 0 0 1-1.98-1.72L3.43 9.2A1 1 0 0 1 4.42 8H5a7 7 0 0 1 14 0h.58a1 1 0 0 1 .99 1.2l-1.59 11.08A2 2 0 0 1 17 22zm0-2h10l1.43-10H5.57zm.02-12h9.96A5 5 0 0 0 7.02 8M8 12h2v2H8zm6 0h2v2h-2zm-3 3h2v2h-2z" />
      </svg>
    );
  }

  if (category === "รองเท้า") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">
          <path d="M3 14.5c3.3 1.6 7 1.9 10.3.8c1.1-.4 1.7-.3 2.7.2c1.5.7 3.2 1.1 5 .8" />
          <path d="M4.2 8.2c.5 1.7 3.2 2.1 5.6 1.4c-.5-1.8.6-2.7 1.4-3.1c2.4 3.4 7 4.8 8.9 8c.9 1.5-.8 3-2.4 3H7.6c-2.7 0-4.1-.7-4.7-2.1c-.7-1.6.2-5 1.3-7.2" />
          <path d="m13.5 9.5l1.3-1.2m1 2.5l1.4-1.2" />
        </g>
      </svg>
    );
  }

  if (category === "อะไหล่ / อุปกรณ์เสริม") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="m20.7 17.3l-4.4-4.4a6.4 6.4 0 0 1-2.2 2.2l4.4 4.4a1.56 1.56 0 0 0 2.2 0a1.56 1.56 0 0 0 0-2.2M11.2 14a4.9 4.9 0 0 0 3.9-5.9l-2.8 2.8l-2.1-2.1L13 6a4.9 4.9 0 0 0-6 6l-4.4 4.4a1.56 1.56 0 0 0 2.2 2.2L9.2 14a5 5 0 0 0 2 .1" />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M4 5a1 1 0 0 1 1-1h5v7H4zm10-1h5a1 1 0 0 1 1 1v5h-6zM4 14h6v6H5a1 1 0 0 1-1-1zm10 0h6v5a1 1 0 0 1-1 1h-5z" />
    </svg>
  );
}

export function BasketIcon({ size = 17 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinejoin="round" d="M2.31 11.243A1 1 0 0 1 3.28 10h17.44a1 1 0 0 1 .97 1.242l-1.811 7.243A2 2 0 0 1 17.939 20H6.061a2 2 0 0 1-1.94-1.515z" />
        <path strokeLinecap="round" d="M9 14v2m6-2v2m-9-6l4-6m8 6l-4-6" />
      </g>
    </svg>
  );
}

export function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

export function normalizeStockValue(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value || 0)) : 0;
}

export function stockLimit(product: ProductItem) {
  return product.trackStock ? normalizeStockValue(product.stockQuantity) : Number.POSITIVE_INFINITY;
}

export function isProductSellable(product: ProductItem) {
  return product.status === "พร้อมขาย" && (!product.trackStock || normalizeStockValue(product.stockQuantity) > 0);
}

export function displaySaleStatus(product: ProductItem) {
  if (product.status === "พร้อมขาย" && product.trackStock && normalizeStockValue(product.stockQuantity) <= 0) {
    return "ปิดขาย";
  }

  return product.status;
}

export function stockLabel(product: ProductItem, inCart = 0) {
  if (!product.trackStock) {
    return null;
  }

  const remaining = Math.max(0, normalizeStockValue(product.stockQuantity) - inCart);
  if (remaining <= 0) {
    return "สต็อกหมด";
  }

  if (product.lowStockThreshold > 0 && remaining <= product.lowStockThreshold) {
    return `ใกล้หมด ${remaining}`;
  }

  return `คงเหลือ ${remaining}`;
}
