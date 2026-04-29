"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { readStoredCustomerDisplay } from "@/components/customer-display-session";
import { requestJson, requestProductList } from "@/components/product-management-studio/lib";
import { categoryOptions, type ProductCategory, type ProductItem } from "@/components/product-management-studio/types";

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

import { BasketIcon, CategoryIcon, displaySaleStatus, formatBaht, isProductSellable, normalizeStockValue, salesCartStorageKey, stockLabel, stockLimit } from "@/components/sales-pagination-mockup/helpers";
import { SalesCartPanel } from "@/components/sales-pagination-mockup/cart-panel";
import { LoadingState } from "@/components/ui-primitives";
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
        const response = await requestProductList(params);

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
    const customerDisplay = readStoredCustomerDisplay();
    if (!customerDisplay) {
      return;
    }

    void requestJson(`/api/customer-displays/${encodeURIComponent(customerDisplay.id)}/state`, {
      method: "PATCH",
      body: JSON.stringify({ status: "IDLE" }),
    }).catch(() => undefined);
  }, []);

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
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_320px] gap-[18px] max-[1366px]:grid-cols-1 max-[820px]:gap-4">
      <section className="grid min-h-0 grid-rows-[auto_auto_auto] content-start gap-[18px]" aria-label="sales main area">
        <div className="rounded-none border border-[var(--border)] bg-[var(--surface)] px-[22px] py-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-[10px]">
            {categoryOptions.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  className={
                    active
                      ? "inline-flex min-h-10 items-center gap-[10px] rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-surface)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[var(--brand-shadow)_0_6px_12px] transition hover:-translate-y-px"
                      : "inline-flex min-h-10 items-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
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

          <div className="grid min-h-0 grid-cols-3 content-start items-start gap-4 overflow-visible p-1 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="products">
          {loading ? (
            <div className="col-span-full grid min-h-[226px] place-items-center rounded-none border border-dashed border-[var(--border)] bg-[var(--panel-subtle)] px-4 py-8 text-center">
              <LoadingState
                size={54}
                label="กำลังโหลดสินค้า..."
                description="ระบบกำลังดึงข้อมูลสินค้าในหมวดที่เลือก"
              />
            </div>
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
                      ? "relative grid h-[226px] animate-[cart-card-pop_520ms_cubic-bezier(.2,.8,.2,1)] content-start gap-3 overflow-hidden rounded-none border border-[var(--cart-glow-border)] [background:var(--panel-elevated)] p-[14px] pb-[68px] shadow-[var(--cart-shadow-mid)_0_8px_20px] max-[640px]:h-auto max-[640px]:min-h-[226px]"
                      : "relative grid h-[226px] content-start gap-3 overflow-hidden rounded-none border border-[var(--border)] [background:var(--panel-elevated)] p-[14px] pb-[68px] transition-all duration-500 hover:-translate-y-0.5 hover:border-[var(--cart-glow-border-soft)] max-[640px]:h-auto max-[640px]:min-h-[226px]"
                  }
                >
                  {added ? (
                    <span
                      key={`added-${product.id}-${animationNonce}`}
                      className="pointer-events-none absolute right-3 top-3 z-10 inline-flex animate-[cart-float_760ms_ease-out] items-center gap-1 rounded-full border border-[var(--cart-badge-border)] bg-[var(--cart-badge-bg)] px-2.5 py-1 text-[0.72rem] font-bold text-[var(--cart-badge-text)] shadow-[var(--cart-shadow-soft)_0_4px_12px]"
                    >
                      +1 เพิ่มแล้ว
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    {product.imageUrl ? (
                      <span
                        className="shrink-0 h-[96px] w-[118px] rounded-xl border border-[var(--border-subtle)] bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.imageUrl})` }}
                        role="img"
                        aria-label={product.name}
                      />
                    ) : (
                      <div className="shrink-0 h-[96px] w-[118px] rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-subtle)]" />
                    )}
                    <div className="grid min-w-0 justify-items-end gap-1 text-right">
                      <b className="text-base leading-[1.2] text-[var(--foreground)]">{formatBaht(product.price)}</b>
                      <span className={saleStatusLabel === "พร้อมขาย" ? "text-[0.78rem] font-bold text-[var(--success)]" : "text-[0.78rem] font-bold text-[var(--foreground-soft)]"}>{saleStatusLabel}</span>
                      <span className="max-w-[86px] text-[0.62rem] leading-[1.2] text-[var(--foreground-soft)]">{product.category}</span>
                      <span className="max-w-[86px] truncate text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--foreground-soft)]">
                        {product.code}
                      </span>
                      {productStockLabel ? (
                        <span className={ready ? "max-w-[86px] truncate text-[0.68rem] font-bold text-[var(--success)]" : "max-w-[86px] truncate text-[0.68rem] font-bold text-[var(--danger)]"}>
                          {productStockLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <strong className="text-base leading-[1.2] text-[var(--foreground)]">{product.name}</strong>
                  </div>
                  <button
                    type="button"
                    className={
                      ready
                        ? "absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] items-center justify-center gap-2 rounded-[10px] border border-transparent [background:var(--brand-gradient)] px-4 text-[0.92rem] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_8px_18px] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--brand-shadow)_0_12px_24px] active:scale-95"
                        : "absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[0.92rem] font-bold text-[var(--foreground-soft)] opacity-60"
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
            <div className="col-span-full grid min-h-[172px] place-items-center rounded-none border border-dashed border-[var(--border-field)] bg-[var(--panel-subtle)] p-6 text-center text-[var(--foreground-soft)]">
              {error || "ยังไม่มีสินค้าในร้าน"}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-t-[var(--border-hairline)] pt-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <button
            type="button"
            className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none max-[720px]:w-full"
            disabled={pageIndex === 0 || loading}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            ย้อนกลับ
          </button>

          <div className="grid justify-items-center gap-1 text-center">
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Product Pagination</p>
            <strong className="text-[1rem] tracking-[-0.03em] text-[var(--foreground)]">หน้าสินค้า {pageIndex + 1}</strong>
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">แสดง {products.length} รายการในหน้านี้</span>
          </div>

          <button
            type="button"
            className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-transparent [background:var(--brand-gradient)] px-4 font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 max-[720px]:w-full"
            disabled={pageIndex >= totalPages - 1 || loading}
            onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
          >
            ถัดไป
          </button>
        </div>
      </section>

      <SalesCartPanel cartPulse={cartPulse} itemCount={itemCount} cartItems={cartItems} cartScrollMetric={cartScrollMetric} cartScrollRef={cartScrollRef} updateCartScrollbar={updateCartScrollbar} handleCartPointerDown={handleCartPointerDown} handleCartPointerMove={handleCartPointerMove} stopCartDrag={stopCartDrag} highlightedCartProductId={pulseProductId || ""} removeItem={removeItem} changeQuantity={changeQuantity} handleAddToCart={handleAddToCart} subtotal={subtotal} clearCart={() => setCartItems([])} handleGoToPayment={handleGoToPayment} />
    </div>
  );
}

