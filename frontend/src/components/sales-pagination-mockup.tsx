"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/components/product-management-studio/lib";
import { categoryOptions, type ProductCategory, type ProductItem, type ProductListResponse } from "@/components/product-management-studio/types";
import { StatusPill } from "@/components/ui-primitives";

type CartItem = {
  product: ProductItem;
  quantity: number;
};

type StoredSalesCart = {
  items?: Array<{
    productId: string;
    quantity: number;
    product?: ProductItem;
  }>;
  savedAt?: string;
};

const salesCartStorageKey = "pos-mans-sales-cart";

function CategoryIcon({ category }: { category: ProductCategory }) {
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

function BasketIcon({ size = 17 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinejoin="round" d="M2.31 11.243A1 1 0 0 1 3.28 10h17.44a1 1 0 0 1 .97 1.242l-1.811 7.243A2 2 0 0 1 17.939 20H6.061a2 2 0 0 1-1.94-1.515z" />
        <path strokeLinecap="round" d="M9 14v2m6-2v2m-9-6l4-6m8 6l-4-6" />
      </g>
    </svg>
  );
}

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

function normalizeStockValue(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value || 0)) : 0;
}

function stockLimit(product: ProductItem) {
  return product.trackStock ? normalizeStockValue(product.stockQuantity) : Number.POSITIVE_INFINITY;
}

function isProductSellable(product: ProductItem) {
  return product.status === "พร้อมขาย" && (!product.trackStock || normalizeStockValue(product.stockQuantity) > 0);
}

function displaySaleStatus(product: ProductItem) {
  if (product.status === "พร้อมขาย" && product.trackStock && normalizeStockValue(product.stockQuantity) <= 0) {
    return "ปิดขาย";
  }

  return product.status;
}

function stockLabel(product: ProductItem, inCart = 0) {
  if (!product.trackStock) {
    return null;
  }

  const remaining = Math.max(0, normalizeStockValue(product.stockQuantity) - inCart);
  if (remaining <= 0) {
    return "สต๊อกหมด";
  }

  if (product.lowStockThreshold > 0 && remaining <= product.lowStockThreshold) {
    return `ใกล้หมด ${remaining}`;
  }

  return `คงเหลือ ${remaining}`;
}

export function SalesPaginationMockup() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ทั้งหมด");
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [pulseProductId, setPulseProductId] = useState<string | null>(null);
  const [animationNonce, setAnimationNonce] = useState(0);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartScrollMetric, setCartScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const animationTimersRef = useRef<number[]>([]);
  const dragScrollRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

  const itemCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(() => cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0), [cartItems]);

  function buildStoredCart(items: CartItem[]): StoredSalesCart {
    return {
      items: items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          code: item.product.code,
          name: item.product.name,
          category: item.product.category,
          price: item.product.price,
          status: item.product.status,
          trackStock: item.product.trackStock,
          stockQuantity: item.product.stockQuantity,
          lowStockThreshold: item.product.lowStockThreshold,
          imageUrl: item.product.imageUrl,
          uploadedKey: item.product.uploadedKey,
        },
      })),
      savedAt: new Date().toISOString(),
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          page: String(pageIndex + 1),
          pageSize: "6",
          category: activeCategory,
        });
        const response = await requestJson<ProductListResponse>(`/api/products?${params.toString()}`);

        if (cancelled) {
          return;
        }

        setProducts(response.products);
        setTotalPages(response.pagination.totalPages);
        if (response.pagination.page !== pageIndex + 1) {
          setPageIndex(response.pagination.page - 1);
        }
      } catch (loadError) {
        if (!cancelled) {
          setProducts([]);
          setError(loadError instanceof Error ? loadError.message : "โหลดรายการสินค้าไม่สำเร็จ");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, pageIndex]);

  useEffect(() => {
    const raw = sessionStorage.getItem(salesCartStorageKey);
    if (!raw) {
      setCartHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredSalesCart;
      const restoredItems = Array.isArray(parsed.items)
        ? parsed.items
            .filter((item) => item.product && item.productId && item.quantity > 0)
            .map((item) => ({
              product: {
                ...item.product!,
                status: item.product!.status || "พร้อมขาย",
                trackStock: item.product!.trackStock ?? false,
                stockQuantity: normalizeStockValue(item.product!.stockQuantity),
                lowStockThreshold: normalizeStockValue(item.product!.lowStockThreshold),
              },
              quantity: Math.max(1, Math.floor(item.quantity)),
            }))
        : [];
      setCartItems(restoredItems);
    } catch {
      sessionStorage.removeItem(salesCartStorageKey);
    } finally {
      setCartHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!cartHydrated) {
      return;
    }

    if (cartItems.length === 0) {
      sessionStorage.removeItem(salesCartStorageKey);
      return;
    }

    sessionStorage.setItem(salesCartStorageKey, JSON.stringify(buildStoredCart(cartItems)));
  }, [cartHydrated, cartItems]);

  useLayoutEffect(() => {
    updateCartScrollbar();
  }, [cartItems.length]);

  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  function updateCartScrollbar() {
    const node = cartScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setCartScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setCartScrollMetric({ top, height, visible: true });
  }

  function handleCategoryChange(category: ProductCategory) {
    setActiveCategory(category);
    setPageIndex(0);
  }

  function triggerAddAnimation(productId: string) {
    animationTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    animationTimersRef.current = [];
    setAnimationNonce((current) => current + 1);
    setAddedProductId(null);
    setPulseProductId(null);
    setCartPulse(false);
    window.requestAnimationFrame(() => {
      setAddedProductId(productId);
      setPulseProductId(productId);
      setCartPulse(true);
    });
    animationTimersRef.current = [
      window.setTimeout(() => setPulseProductId(null), 520),
      window.setTimeout(() => setAddedProductId(null), 760),
      window.setTimeout(() => setCartPulse(false), 560),
    ];
  }

  function handleAddToCart(product: ProductItem) {
    if (!isProductSellable(product)) {
      return;
    }

    setCartItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      const limit = stockLimit(product);
      if (existing) {
        if (existing.quantity >= limit) {
          return current;
        }

        return current.map((item) => (item.product.id === product.id ? { ...item, quantity: Math.min(limit, item.quantity + 1), product } : item));
      }

      return [{ product, quantity: 1 }, ...current];
    });
    triggerAddAnimation(product.id);
  }

  function changeQuantity(productId: string, direction: 1 | -1) {
    setCartItems((current) =>
      current.map((item) => {
        if (item.product.id !== productId) {
          return item;
        }

        return { ...item, quantity: Math.max(1, Math.min(stockLimit(item.product), item.quantity + direction)) };
      }),
    );
  }

  function removeItem(productId: string) {
    setCartItems((current) => current.filter((item) => item.product.id !== productId));
  }

  function handleGoToPayment() {
    if (cartItems.length === 0) {
      return;
    }

    sessionStorage.setItem(salesCartStorageKey, JSON.stringify(buildStoredCart(cartItems)));
    router.push("/owner/payments");
  }

  function handleCartPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.target instanceof HTMLElement && event.target.closest("button")) {
      return;
    }

    const target = event.currentTarget;
    dragScrollRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleCartPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateCartScrollbar();
  }

  function stopCartDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    dragScrollRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1180px]:grid-cols-1">
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[18px]" aria-label="sales main area">
        <div className="rounded-none border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(22,27,38,0.94),rgba(18,22,34,0.9))] px-[22px] py-5">
          <div className="flex flex-wrap gap-[10px]">
            {categoryOptions.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  className={
                    active
                      ? "inline-flex min-h-10 items-center gap-[10px] rounded-[10px] border border-[rgba(108,92,231,0.5)] bg-[rgba(108,92,231,0.14)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[rgba(108,92,231,0.1)_0_6px_12px] transition hover:-translate-y-px"
                      : "inline-flex min-h-10 items-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
                  }
                  onClick={() => handleCategoryChange(category)}
                >
                  <CategoryIcon category={category} />
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-3 content-start items-start gap-4 overflow-visible p-1 max-[720px]:grid-cols-2" aria-label="products">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <article
                key={`loading-${index}`}
                className="grid h-[226px] animate-pulse content-start gap-3 rounded-none border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(26,32,48,0.72),rgba(22,27,38,0.72))] p-[14px]"
              >
                <div className="h-[96px] w-[118px] rounded-xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                <div className="h-4 w-3/4 rounded bg-[rgba(255,255,255,0.08)]" />
                <div className="h-3 w-1/2 rounded bg-[rgba(255,255,255,0.06)]" />
              </article>
            ))
          ) : products.length > 0 ? (
            products.map((product) => {
              const currentCartQuantity = cartItems.find((item) => item.product.id === product.id)?.quantity ?? 0;
              const productStockLabel = stockLabel(product, currentCartQuantity);
              const ready = isProductSellable(product) && currentCartQuantity < stockLimit(product);
              const saleStatusLabel = displaySaleStatus(product);
              const activePulse = pulseProductId === product.id;
              const added = addedProductId === product.id;

              return (
                <article
                  key={product.id}
                  className={
                    activePulse
                      ? "relative grid h-[226px] animate-[cart-card-pop_520ms_cubic-bezier(.2,.8,.2,1)] content-start gap-3 overflow-hidden rounded-none border border-[rgba(240,106,223,0.46)] bg-[linear-gradient(180deg,rgba(38,30,58,0.95),rgba(22,27,38,0.92))] p-[14px] pb-[68px] shadow-[rgba(240,106,223,0.16)_0_14px_32px]"
                      : "relative grid h-[226px] content-start gap-3 overflow-hidden rounded-none border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(26,32,48,0.92),rgba(22,27,38,0.92))] p-[14px] pb-[68px] transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(240,106,223,0.26)]"
                  }
                >
                  {added ? (
                    <span
                      key={`added-${product.id}-${animationNonce}`}
                      className="pointer-events-none absolute right-3 top-3 z-10 inline-flex animate-[cart-float_760ms_ease-out] items-center gap-1 rounded-full border border-[rgba(117,230,161,0.28)] bg-[rgba(18,64,42,0.9)] px-2.5 py-1 text-[0.72rem] font-bold text-[#8cffbd]"
                    >
                      +1 เพิ่มแล้ว
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    {product.imageUrl ? (
                      <span
                        className="h-[96px] w-[118px] rounded-xl border border-[rgba(100,120,160,0.14)] bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.imageUrl})` }}
                        role="img"
                        aria-label={product.name}
                      />
                    ) : (
                      <div className="h-[96px] w-[118px] rounded-xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    )}
                    <div className="grid justify-items-end gap-1 text-right">
                      <b className="text-base leading-[1.2] text-white">{formatBaht(product.price)}</b>
                      <span className={saleStatusLabel === "พร้อมขาย" ? "text-[0.78rem] font-bold text-[#75e6a1]" : "text-[0.78rem] font-bold text-[var(--foreground-soft)]"}>{saleStatusLabel}</span>
                      <span className="max-w-[86px] text-[0.62rem] leading-[1.2] text-[var(--foreground-soft)]">{product.category}</span>
                      <span className="max-w-[86px] truncate text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
                        {product.code}
                      </span>
                      {productStockLabel ? (
                        <span className={ready ? "max-w-[86px] truncate text-[0.68rem] font-bold text-[#8cffbd]" : "max-w-[86px] truncate text-[0.68rem] font-bold text-[#ff8fa2]"}>
                          {productStockLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <strong className="text-base leading-[1.2] text-white">{product.name}</strong>
                  </div>
                  <button
                    type="button"
                    className={
                      ready
                        ? "absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] items-center justify-center gap-2 rounded-[10px] border border-transparent bg-[linear-gradient(135deg,#f06adf_0%,#a96cff_100%)] px-4 text-[0.92rem] font-bold text-white shadow-[rgba(240,106,223,0.22)_0_8px_18px] transition duration-200 hover:-translate-y-0.5 hover:shadow-[rgba(240,106,223,0.32)_0_12px_24px] active:scale-95"
                        : "absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[rgba(255,255,255,0.04)] px-4 text-[0.92rem] font-bold text-[var(--foreground-soft)] opacity-60"
                    }
                    disabled={!ready}
                    onClick={() => handleAddToCart(product)}
                  >
                    <BasketIcon />
                    เพิ่มตะกร้า
                  </button>
                </article>
              );
            })
          ) : (
            <div className="col-span-full grid min-h-[172px] place-items-center rounded-none border border-dashed border-[rgba(100,120,160,0.22)] bg-[rgba(22,27,38,0.58)] p-6 text-center text-[var(--foreground-soft)]">
              {error || "ยังไม่มีสินค้าในร้าน"}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-t-[rgba(100,120,160,0.12)] pt-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <button
            type="button"
            className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-4 font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none max-[720px]:w-full"
            disabled={pageIndex === 0 || loading}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            ย้อนกลับ
          </button>

          <div className="grid justify-items-center gap-1 text-center">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Menu Pagination</p>
            <strong className="text-[1rem] tracking-[-0.03em] text-white">หน้ารายการ {pageIndex + 1}</strong>
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">แสดง {products.length} เมนูในหน้านี้</span>
          </div>

          <button
            type="button"
            className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-4 font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 max-[720px]:w-full"
            disabled={pageIndex >= totalPages - 1 || loading}
            onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
          >
            ถัดไป
          </button>
        </div>
      </section>

      <aside
        className={
          cartPulse
            ? "grid min-h-0 animate-[cart-panel-pulse_560ms_ease-out] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[18px] rounded-none border border-[rgba(240,106,223,0.38)] bg-[rgba(22,27,38,0.66)] p-[18px] shadow-[rgba(240,106,223,0.12)_0_16px_36px] max-[720px]:p-4"
            : "grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[18px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.58)] p-[18px] shadow-[var(--shadow-soft)] max-[720px]:p-4"
        }
        aria-label="cart layout"
      >
        <div className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Current Bill</p>
            <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">{itemCount > 0 ? "ตะกร้าปัจจุบัน" : "ยังไม่มีบิล"}</strong>
          </div>
          <StatusPill>{itemCount} รายการ</StatusPill>
        </div>

        {cartItems.length > 0 ? (
          <div className="relative min-h-0">
            <div
              ref={cartScrollRef}
              className={
                cartScrollMetric.visible
                  ? "sales-cart-scroll grid h-full min-h-0 cursor-grab select-none content-start gap-3 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                  : "grid h-full min-h-0 select-none content-start gap-3 overflow-hidden py-0 pl-0 pr-0"
              }
              onScroll={updateCartScrollbar}
              onPointerDown={handleCartPointerDown}
              onPointerMove={handleCartPointerMove}
              onPointerUp={stopCartDrag}
              onPointerCancel={stopCartDrag}
              onPointerLeave={stopCartDrag}
            >
              {cartItems.map((item) => {
                const highlighted = pulseProductId === item.product.id;

                return (
                  <div
                    key={item.product.id}
                    className={
                      highlighted
                        ? "grid animate-[cart-row-enter_340ms_cubic-bezier(.2,.8,.2,1)] grid-cols-[75px_minmax(0,1fr)] items-start gap-3 rounded-none border border-[rgba(240,106,223,0.32)] bg-[rgba(240,106,223,0.09)] p-[10px] shadow-[rgba(240,106,223,0.12)_0_8px_18px]"
                        : "grid grid-cols-[75px_minmax(0,1fr)] items-start gap-3 rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-[10px]"
                    }
                  >
                    {item.product.imageUrl ? (
                      <span
                        className="h-[83px] w-[75px] rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.product.imageUrl})` }}
                        role="img"
                        aria-label={item.product.name}
                      />
                    ) : (
                      <span className="grid h-[52px] w-[52px] place-items-center rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)] text-[var(--foreground-soft)]">
                        <BasketIcon size={18} />
                      </span>
                    )}
                    <div className="grid min-w-0 gap-2 pt-0.5">
                      <div className="grid min-w-0 gap-1">
                        <strong className="truncate text-[0.95rem] leading-[1.25] text-white">{item.product.name}</strong>
                        <span className="text-[0.78rem] text-[var(--foreground-soft)]">
                          {formatBaht(item.product.price)} x {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex h-8 items-center rounded-[10px] border border-[var(--border)] bg-[rgba(10,13,20,0.42)]">
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center text-[1rem] font-bold text-[var(--foreground)] transition hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-45 disabled:hover:bg-transparent"
                            disabled={item.quantity <= 1}
                            onClick={() => changeQuantity(item.product.id, -1)}
                            aria-label={`ลดจำนวน ${item.product.name}`}
                          >
                            -
                          </button>
                          <span className="grid h-8 min-w-8 place-items-center text-[0.85rem] font-bold text-white">{item.quantity}</span>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center text-[1rem] font-bold text-[var(--foreground)] transition hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-45 disabled:hover:bg-transparent"
                            disabled={item.quantity >= stockLimit(item.product)}
                            onClick={() => changeQuantity(item.product.id, 1)}
                            aria-label={`เพิ่มจำนวน ${item.product.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="h-8 rounded-[10px] border border-[rgba(232,93,117,0.22)] px-2.5 text-[0.78rem] font-bold text-[#ff8fa2] transition hover:bg-[rgba(232,93,117,0.1)]"
                          onClick={() => removeItem(item.product.id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartScrollMetric.visible ? (
              <span className="pointer-events-none absolute bottom-0 right-0 top-0 w-[7px] bg-[rgba(15,19,29,0.78)]">
                <span
                  className="absolute left-0 w-full rounded-full bg-[linear-gradient(180deg,rgba(240,106,223,0.98),rgba(169,108,255,0.94))] shadow-[rgba(240,106,223,0.24)_0_0_14px]"
                  style={{ top: `${cartScrollMetric.top}%`, height: `${cartScrollMetric.height}%` }}
                />
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-0 place-items-center rounded-none border border-dashed border-[rgba(100,120,160,0.2)] bg-[rgba(255,255,255,0.02)] p-5 text-center">
            <div className="grid max-w-[220px] gap-2">
              <strong className="text-base leading-[1.35] text-white">เริ่มเพิ่มสินค้าเข้าตะกร้า</strong>
              <span className="text-[0.92rem] leading-[1.55] text-[var(--foreground-soft)]">กดปุ่มเพิ่มตะกร้าบนสินค้า รายการจะเด้งเข้ามาตรงนี้ทันที</span>
            </div>
          </div>
        )}

        <div className="grid gap-3 border-t border-t-[var(--border)] pt-2">
          {[
            ["ยอดรวม", formatBaht(subtotal)],
            ["สุทธิ", formatBaht(subtotal)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
              <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="text-base leading-[1.2] text-white">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <button
            type="button"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            disabled={cartItems.length === 0}
            onClick={() => setCartItems([])}
          >
            ล้างบิล
          </button>
          <button
            type="button"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-[18px] font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={cartItems.length === 0}
            onClick={handleGoToPayment}
          >
            ไปชำระเงิน
          </button>
        </div>
      </aside>
    </div>
  );
}
