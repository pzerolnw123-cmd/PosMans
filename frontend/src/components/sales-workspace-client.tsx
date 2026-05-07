"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { setStoredCustomerDisplayIdle } from "@/components/customer-display-session";
import { requestProductList } from "@/components/product-management-studio/lib";
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

import { BasketIcon, CategoryIcon, displaySaleStatus, formatBaht, isProductSellable, normalizeStockValue, salesCartStorageKey, stockLabel, stockLimit } from "@/components/sales-workspace/helpers";
import { SalesCartPanel } from "@/components/sales-workspace/cart-panel";
import { ipadMiniLandscapeClass } from "@/components/owner-workspace/ipad-air-classes";
import { ownerLandscapeClass, ownerLandscapePanelPaddingClass, ownerLandscapeTightGapClass } from "@/components/owner-workspace/landscape-preset";
import { LoadingState } from "@/components/ui-primitives";

const desktopFinePointerClass = "[@media(min-width:1181px)_and_(pointer:fine)]";
const ipadMiniSaleProductCardClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!min-h-[194px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!gap-[5px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!p-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!pb-9";
const ipadMiniSaleProductMediaClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!block";
const ipadMiniSaleProductImageClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!h-16 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!w-[calc(100%-54px)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!max-w-[118px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!rounded-[9px]";
const ipadMiniSaleProductNameMiniClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!grid [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!justify-items-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!mt-1.5";
const ipadMiniSaleProductMetaClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!mt-[3px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!justify-items-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!gap-px [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left";
const ipadMiniSaleProductPriceClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!absolute [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!right-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!top-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!z-[1] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-right [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.92rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!leading-[1.05]";
const ipadMiniSaleProductStatusClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!block [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.68rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!leading-[1.15]";
const ipadMiniSaleProductDetailClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!block [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!max-w-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.58rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!leading-[1.15]";
const ipadMiniSaleProductCodeClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!block [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!max-w-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.56rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!leading-[1.15] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!tracking-[0.08em]";
const ipadMiniSaleProductStockMiniClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!block [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!mt-[3px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!max-w-[106px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-left [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.62rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!leading-[1.15]";
const ipadMiniSaleProductHideClass = "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!hidden";
const ipadMiniSaleProductButtonClass =
  "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!bottom-3.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!left-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!right-2.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!h-12 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!min-h-12 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!w-12 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!min-w-12 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!gap-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!rounded-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!p-0";
const posWideShortSaleProductGridClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)_and_(pointer:fine)]:!grid-cols-2";
const posWideShortSaleProductCategoryClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)_and_(pointer:fine)]:!block [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)_and_(pointer:fine)]:!max-w-[150px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)_and_(pointer:fine)]:!overflow-visible [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)_and_(pointer:fine)]:!whitespace-nowrap";
const androidTabletLandscapeSaleProductCategoryClass =
  "[@media(min-width:1181px)_and_(max-width:1280px)_and_(min-height:721px)_and_(max-height:800px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!block [@media(min-width:1181px)_and_(max-width:1280px)_and_(min-height:721px)_and_(max-height:800px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!max-w-[150px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(min-height:721px)_and_(max-height:800px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!overflow-visible [@media(min-width:1181px)_and_(max-width:1280px)_and_(min-height:721px)_and_(max-height:800px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!whitespace-nowrap";
async function loadAllProducts() {
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

function compactStockLabel(product: ProductItem, inCart = 0) {
  if (!product.trackStock) {
    return null;
  }

  const remaining = Math.max(0, normalizeStockValue(product.stockQuantity) - inCart);
  if (remaining <= 0) {
    return "สต็อกหมด";
  }

  const displayRemaining = remaining > 999 ? "999+" : String(remaining);

  if (product.lowStockThreshold > 0 && remaining <= product.lowStockThreshold) {
    return `ใกล้หมด ${displayRemaining}`;
  }

  return `คงเหลือ ${displayRemaining}`;
}
export function SalesWorkspaceClient() {
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
  const [productScrollMetric, setProductScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const cartScrollRef = useRef<HTMLDivElement | null>(null);
  const productScrollRef = useRef<HTMLDivElement | null>(null);
  const animationTimersRef = useRef<number[]>([]);
  const cartReconciledRef = useRef(false);
  const dragScrollRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });
  const productDragScrollRef = useRef({
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
          costPerUnit: item.product.costPerUnit,
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

  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    const ipadMediaQuery = window.matchMedia("(max-width: 1366px) and (any-pointer: coarse)");
    const syncPageSize = () => setPageSize(ipadMediaQuery.matches ? 8 : 6);
    syncPageSize();
    ipadMediaQuery.addEventListener("change", syncPageSize);
    return () => ipadMediaQuery.removeEventListener("change", syncPageSize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      try {
        setLoading(true);
        setError("");
        const params = new URLSearchParams({
          page: String(pageIndex + 1),
          pageSize: String(pageSize),
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
  }, [activeCategory, pageIndex, pageSize]);

  useEffect(() => {
    void setStoredCustomerDisplayIdle().catch(() => undefined);
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
                costPerUnit: normalizeStockValue(item.product!.costPerUnit),
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

    if (cartItems.length > 0 && !cartReconciledRef.current) {
      cartReconciledRef.current = true;

      let cancelled = false;

      void (async () => {
        const liveProducts = await loadAllProducts().catch(() => []);
        const liveProductsById = new Map(liveProducts.map((product) => [product.id, product] as const));
        const reconciledItems = cartItems
          .map((item) => {
            const liveProduct = liveProductsById.get(item.product.id);
            if (!liveProduct) {
              return null;
            }

            return {
              product: {
                ...liveProduct,
                status: liveProduct.status || "พร้อมขาย",
                costPerUnit: normalizeStockValue(liveProduct.costPerUnit),
                trackStock: liveProduct.trackStock ?? false,
                stockQuantity: normalizeStockValue(liveProduct.stockQuantity),
                lowStockThreshold: normalizeStockValue(liveProduct.lowStockThreshold),
              },
              quantity: Math.max(1, Math.floor(item.quantity)),
            };
          })
          .filter((item): item is CartItem => Boolean(item));

        if (!cancelled) {
          setCartItems(reconciledItems);
        }
      })();

      return () => {
        cancelled = true;
      };
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

  useLayoutEffect(() => {
    updateProductScrollbar();
  }, [products.length, pageSize]);

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

  function updateProductScrollbar() {
    const node = productScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setProductScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setProductScrollMetric({ top, height, visible: true });
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

  function handleProductCardKeyDown(event: KeyboardEvent<HTMLElement>, product: ProductItem, ready: boolean) {
    if (!ready) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleAddToCart(product);
    }
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

  function handleProductPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button, [data-product-card='true']"))) {
      return;
    }

    const target = event.currentTarget;
    productDragScrollRef.current = {
      active: true,
      pointerId: event.pointerId,
      startY: event.clientY,
      scrollTop: target.scrollTop,
    };
    target.setPointerCapture(event.pointerId);
    target.dataset.dragging = "true";
  }

  function handleProductPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = productDragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateProductScrollbar();
  }

  function stopProductDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = productDragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    productDragScrollRef.current.active = false;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className={`grid h-full min-h-0 grid-cols-[minmax(0,1fr)_316px] gap-[18px] [@media(orientation:portrait)]:h-auto [@media(orientation:portrait)]:grid-cols-1 [@media(orientation:portrait)]:gap-4 ${desktopFinePointerClass}:grid-cols-[minmax(0,1fr)_316px] ${desktopFinePointerClass}:gap-[18px] ${ownerLandscapeClass}:grid-cols-[minmax(0,1fr)_292px] ${ownerLandscapeClass}:gap-[14px] ${ipadMiniLandscapeClass}:grid-cols-[minmax(0,1fr)_264px] ${ipadMiniLandscapeClass}:gap-[10px] max-[820px]:h-auto max-[820px]:grid-cols-1 max-[820px]:gap-4`}>
      <section className={`flex min-h-0 flex-col gap-[18px] ${desktopFinePointerClass}:gap-[18px] ${ownerLandscapeTightGapClass} ${ipadMiniLandscapeClass}:gap-[10px] max-[1280px]:min-h-0`} aria-label="sales main area">
        <div className={`rounded-none border border-[var(--border)] bg-[var(--surface)] px-[22px] py-5 shadow-[var(--shadow-soft)] ${ownerLandscapePanelPaddingClass} ${ipadMiniLandscapeClass}:px-3 ${ipadMiniLandscapeClass}:py-3 max-[820px]:px-4 max-[820px]:py-4 max-[520px]:px-3.5`}>
          <div className={`flex flex-wrap gap-[10px] ${ipadMiniLandscapeClass}:gap-2 max-[520px]:grid max-[520px]:grid-cols-1`}>
            {categoryOptions.map((category) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  className={
                    active
                      ? `inline-flex min-h-10 items-center justify-center gap-[10px] rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent-surface)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[var(--brand-shadow)_0_6px_12px] transition hover:-translate-y-px ${ownerLandscapeClass}:min-h-[38px] ${ownerLandscapeClass}:px-[14px] ${ownerLandscapeClass}:text-[0.92rem] ${ipadMiniLandscapeClass}:!min-h-[34px] ${ipadMiniLandscapeClass}:!gap-2 ${ipadMiniLandscapeClass}:!px-3 ${ipadMiniLandscapeClass}:!text-[0.82rem]`
                      : `inline-flex min-h-10 items-center justify-center gap-[10px] rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)] ${ownerLandscapeClass}:min-h-[38px] ${ownerLandscapeClass}:px-[14px] ${ownerLandscapeClass}:text-[0.92rem] ${ipadMiniLandscapeClass}:!min-h-[34px] ${ipadMiniLandscapeClass}:!gap-2 ${ipadMiniLandscapeClass}:!px-3 ${ipadMiniLandscapeClass}:!text-[0.82rem]`
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

        <div className="relative min-h-0 flex-1">
          <div
            ref={productScrollRef}
            onScroll={updateProductScrollbar}
            onPointerDown={handleProductPointerDown}
            onPointerMove={handleProductPointerMove}
            onPointerUp={stopProductDrag}
            onPointerCancel={stopProductDrag}
            onPointerLeave={stopProductDrag}
            className={
              productScrollMetric.visible
                ? `sales-cart-scroll relative grid h-full min-h-0 touch-auto cursor-grab select-none content-start gap-4 p-1 pb-6 pr-4 active:cursor-grabbing grid-cols-3 [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 [@media(max-width:1366px)_and_(any-pointer:coarse)]:grid-cols-2 max-[1024px]:grid-cols-2 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1 ${desktopFinePointerClass}:grid-cols-3 ${desktopFinePointerClass}:gap-4 ${posWideShortSaleProductGridClass} ${ownerLandscapeClass}:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!grid-cols-2 ${ipadMiniLandscapeClass}:!gap-2.5 ${ipadMiniLandscapeClass}:!pb-4 ${ipadMiniLandscapeClass}:!pr-3`
                : `sales-cart-scroll relative grid h-full min-h-0 touch-auto select-auto content-start gap-4 p-1 pb-6 pr-0 grid-cols-3 [@media(orientation:portrait)]:grid-cols-2 [@media(orientation:portrait)_and_(max-width:640px)]:grid-cols-1 [@media(max-width:1366px)_and_(any-pointer:coarse)]:grid-cols-2 max-[1024px]:grid-cols-2 max-[820px]:grid-cols-2 max-[640px]:grid-cols-1 ${desktopFinePointerClass}:grid-cols-3 ${desktopFinePointerClass}:gap-4 ${posWideShortSaleProductGridClass} ${ownerLandscapeClass}:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!grid-cols-2 ${ipadMiniLandscapeClass}:!gap-2.5 ${ipadMiniLandscapeClass}:!pb-4`
            }
            aria-label="products"
          >
          {loading ? (
            <div className="absolute inset-1 grid place-items-center rounded-none border border-dashed border-[var(--border)] bg-[var(--panel-subtle)] px-4 py-8 text-center">
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
              const compactProductStockLabel = compactStockLabel(product, currentCartQuantity);
              const ready = isProductSellable(product) && currentCartQuantity < stockLimit(product);
              const saleStatusLabel = displaySaleStatus(product);
              const activePulse = pulseProductId === product.id;
              const added = addedProductId === product.id;

              return (
                <article
                  key={product.id}
                  data-product-card={ready ? "true" : undefined}
                  role={ready ? "button" : undefined}
                  tabIndex={ready ? 0 : undefined}
                  aria-disabled={ready ? undefined : true}
                  onClick={ready ? () => handleAddToCart(product) : undefined}
                  onKeyDown={(event) => handleProductCardKeyDown(event, product, ready)}
                  className={
                    activePulse
                      ? `sales-product-card relative grid min-h-[226px] animate-[cart-card-pop_520ms_cubic-bezier(.2,.8,.2,1)] content-start gap-3 overflow-hidden rounded-none border border-[var(--cart-glow-border)] [background:var(--panel-elevated)] p-[14px] pb-[68px] shadow-[var(--cart-shadow-mid)_0_8px_20px] ${ready ? "cursor-pointer" : "cursor-default"} ${desktopFinePointerClass}:min-h-[226px] ${desktopFinePointerClass}:gap-3 ${desktopFinePointerClass}:p-[14px] ${desktopFinePointerClass}:pb-[68px] ${ownerLandscapeClass}:min-h-[204px] ${ownerLandscapeClass}:gap-2.5 ${ownerLandscapeClass}:p-3 ${ownerLandscapeClass}:pb-[60px] ${ipadMiniSaleProductCardClass}`
                      : `sales-product-card relative grid min-h-[226px] content-start gap-3 overflow-hidden rounded-none border border-[var(--border)] [background:var(--panel-elevated)] p-[14px] pb-[68px] transition-all duration-500 ${ready ? "cursor-pointer hover:-translate-y-0.5 hover:border-[var(--cart-glow-border-soft)]" : "cursor-default"} ${desktopFinePointerClass}:min-h-[226px] ${desktopFinePointerClass}:gap-3 ${desktopFinePointerClass}:p-[14px] ${desktopFinePointerClass}:pb-[68px] ${ownerLandscapeClass}:min-h-[204px] ${ownerLandscapeClass}:gap-2.5 ${ownerLandscapeClass}:p-3 ${ownerLandscapeClass}:pb-[60px] ${ipadMiniSaleProductCardClass}`
                  }
                >
                  {added ? (
                    <span
                      key={`added-${product.id}-${animationNonce}`}
                      className={`pointer-events-none absolute right-3 top-3 z-10 inline-flex animate-[cart-float_760ms_ease-out] items-center gap-1 rounded-full border border-[var(--cart-badge-border)] bg-[var(--cart-badge-bg)] px-2.5 py-1 text-[0.72rem] font-bold text-[var(--cart-badge-text)] shadow-[var(--cart-shadow-soft)_0_4px_12px] ${ipadMiniLandscapeClass}:!right-2 ${ipadMiniLandscapeClass}:!top-2 ${ipadMiniLandscapeClass}:!px-2 ${ipadMiniLandscapeClass}:!py-0.5 ${ipadMiniLandscapeClass}:!text-[0.62rem]`}
                    >
                      +1 เพิ่มแล้ว
                    </span>
                  ) : null}
                  <div className={`sales-product-card-media flex items-start justify-between gap-3 ${ipadMiniSaleProductMediaClass} max-[420px]:flex-col`}>
                    {product.imageUrl ? (
                      <span
                        className={`sales-product-card-image block h-[96px] w-[118px] shrink-0 rounded-xl border border-[var(--border-subtle)] bg-cover bg-center ${ownerLandscapeClass}:h-[82px] ${ownerLandscapeClass}:w-[102px] ${ipadMiniSaleProductImageClass} max-[420px]:w-full`}
                        style={{ backgroundImage: `url(${product.imageUrl})` }}
                        role="img"
                        aria-label={product.name}
                      />
                    ) : (
                      <div className={`sales-product-card-image block h-[96px] w-[118px] shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-subtle)] ${ownerLandscapeClass}:h-[82px] ${ownerLandscapeClass}:w-[102px] ${ipadMiniSaleProductImageClass} max-[420px]:w-full`} />
                    )}
                      <div className={`sales-product-card-name-mini hidden ${ipadMiniSaleProductNameMiniClass}`}>
                        <strong className="block max-w-full truncate text-[0.86rem] font-bold leading-[1.35] text-[var(--foreground)]">
                          {product.name}
                        </strong>
                      </div>
                      <div className={`sales-product-card-meta grid min-w-0 justify-items-end gap-1 text-right ${ipadMiniSaleProductMetaClass} max-[420px]:w-full max-[420px]:justify-items-start max-[420px]:text-left`}>
                        <b className={`text-base leading-[1.2] text-[var(--foreground)] max-[1366px]:text-[1.25rem] ${ownerLandscapeClass}:text-[1.02rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[1.05rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[1.05rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[1.05rem] ${ipadMiniSaleProductPriceClass}`}>{formatBaht(product.price)}</b>
                        <span className={saleStatusLabel === "พร้อมขาย" ? `text-[0.78rem] font-bold text-[var(--success)] max-[1366px]:text-[0.95rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] ${ipadMiniSaleProductStatusClass}` : `text-[0.78rem] font-bold text-[var(--foreground-soft)] max-[1366px]:text-[0.95rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.82rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.82rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.82rem] ${ipadMiniSaleProductStatusClass}`}>{saleStatusLabel}</span>
                        <span className={`max-w-[86px] text-[0.62rem] leading-[1.2] text-[var(--foreground-soft)] max-[1366px]:max-w-[120px] max-[1366px]:text-[0.85rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.72rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.72rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.72rem] ${posWideShortSaleProductCategoryClass} ${androidTabletLandscapeSaleProductCategoryClass} ${ipadMiniSaleProductDetailClass}`}>{product.category}</span>
                        <span className={`max-w-[86px] truncate text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--foreground-soft)] max-[1366px]:max-w-[120px] max-[1366px]:text-[0.75rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.66rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.66rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.66rem] ${ipadMiniSaleProductCodeClass}`}>
                          {product.code}
                        </span>
                        {productStockLabel ? (
                          <span className={ready ? `sales-product-card-stock-mini hidden text-[0.62rem] font-bold text-[var(--success)] ${ipadMiniSaleProductStockMiniClass}` : `sales-product-card-stock-mini hidden text-[0.62rem] font-bold text-[var(--danger)] ${ipadMiniSaleProductStockMiniClass}`}>
                            {productStockLabel}
                          </span>
                        ) : null}
                      </div>
                  </div>
                  <div className={`sales-product-card-name grid min-w-0 gap-1.5 ${ipadMiniSaleProductHideClass}`}>
                    <strong className={`block max-w-full truncate text-base leading-[1.2] text-[var(--foreground)] max-[1366px]:text-[1.15rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[1.02rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[1.02rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[1.02rem] ${ipadMiniLandscapeClass}:!text-[0.86rem] ${ipadMiniLandscapeClass}:!leading-[1.15]`}>{product.name}</strong>
                  </div>
                  {productStockLabel ? (
                    <span className={ready ? `sales-product-card-stock absolute bottom-[18px] right-[14px] z-[1] max-w-[92px] truncate text-right text-[0.68rem] font-bold text-[var(--success)] max-[1366px]:max-w-[120px] max-[1366px]:text-[0.85rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.76rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.76rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.76rem] ${ipadMiniSaleProductHideClass}` : `sales-product-card-stock absolute bottom-[18px] right-[14px] z-[1] max-w-[92px] truncate text-right text-[0.68rem] font-bold text-[var(--danger)] max-[1366px]:max-w-[120px] max-[1366px]:text-[0.85rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.76rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.76rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.76rem] ${ipadMiniSaleProductHideClass}`}>
                      {compactProductStockLabel}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="เพิ่มตะกร้า"
                    className={
                      ready
                        ? `absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] items-center justify-center gap-2 rounded-[10px] border border-transparent [background:var(--brand-gradient)] px-4 text-[0.92rem] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_8px_18px] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--brand-shadow)_0_12px_24px] active:scale-95 max-[1366px]:h-[48px] max-[1366px]:text-[1.1rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:h-[44px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-w-[116px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.92rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-[44px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-[44px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-w-[116px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-w-[116px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.92rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.92rem] ${ipadMiniSaleProductButtonClass}`
                        : `absolute bottom-[14px] left-[14px] inline-flex h-[42px] min-w-[126px] cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 text-[0.92rem] font-bold text-[var(--foreground-soft)] opacity-60 max-[1366px]:h-[48px] max-[1366px]:text-[1.1rem] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:h-[44px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:min-w-[116px] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:px-3 [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:text-[0.92rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-[44px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:h-[44px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-w-[116px] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:min-w-[116px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.92rem] [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:text-[0.92rem] ${ipadMiniSaleProductButtonClass}`
                    }
                    disabled={!ready}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    <BasketIcon />
                    <span className={`sales-product-card-button-label ${ipadMiniSaleProductHideClass}`}>เพิ่มตะกร้า</span>
                  </button>
                </article>
              );
            })
          ) : (
            <div className="absolute inset-1 grid place-items-center rounded-none border border-dashed border-[var(--border-field)] bg-[var(--panel-subtle)] p-6 text-center text-[var(--foreground-soft)]">
              {error || "ยังไม่มีสินค้าในร้าน"}
            </div>
          )}
          </div>
          {productScrollMetric.visible ? (
            <span className="pointer-events-none absolute bottom-4 right-0 top-1 w-[7px] rounded-full bg-[var(--scroll-track)]">
              <span
                className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                style={{ top: `${productScrollMetric.top}%`, height: `${productScrollMetric.height}%` }}
              />
            </span>
          ) : null}
        </div>

        <div className={`relative flex shrink-0 items-center justify-between gap-4 border-t border-t-[var(--border-hairline)] bg-[var(--background)] pt-4 ${ipadMiniLandscapeClass}:!gap-2 ${ipadMiniLandscapeClass}:!pt-2 max-[720px]:flex-col max-[720px]:items-stretch`}>
          <button
            type="button"
            className={`inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${ipadMiniLandscapeClass}:!h-[42px] ${ipadMiniLandscapeClass}:!w-[116px] ${ipadMiniLandscapeClass}:!rounded-xl ${ipadMiniLandscapeClass}:!px-3 ${ipadMiniLandscapeClass}:!text-[0.84rem] max-[720px]:w-full`}
            disabled={pageIndex === 0 || loading}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
          >
            ย้อนกลับ
          </button>

          <div className="grid justify-items-center gap-1 text-center">
            <p className={`m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)] ${ipadMiniLandscapeClass}:!text-[0.56rem] ${ipadMiniLandscapeClass}:!tracking-[0.16em]`}>Product Pagination</p>
            <strong className={`text-[1rem] tracking-[-0.03em] text-[var(--foreground)] ${ipadMiniLandscapeClass}:!text-[0.9rem]`}>หน้าสินค้า {pageIndex + 1}</strong>
            <span className={`text-[0.92rem] text-[var(--foreground-soft)] ${ipadMiniLandscapeClass}:!text-[0.76rem] ${ipadMiniLandscapeClass}:!leading-[1.2]`}>แสดง {products.length} รายการในหน้านี้</span>
          </div>

          <button
            type="button"
            className={`inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-transparent [background:var(--brand-gradient)] px-4 font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${ipadMiniLandscapeClass}:!h-[42px] ${ipadMiniLandscapeClass}:!w-[116px] ${ipadMiniLandscapeClass}:!rounded-xl ${ipadMiniLandscapeClass}:!px-3 ${ipadMiniLandscapeClass}:!text-[0.84rem] max-[720px]:w-full`}
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



