import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { studioResponsiveClass } from "@/components/product-management-studio/layout-classes";
import { dangerButtonClass, inputClass, Loader, LoadingState, primaryButtonClass, secondaryButtonClass, selectClass, successButtonClass, whiteButtonClass } from "@/components/ui-primitives";
import { canUseNextImage, Field } from "@/components/product-management-studio/shared";
import type { ProductItem } from "@/components/product-management-studio/types";

type ProductDetailPanelProps = {
  compactMode: boolean;
  productsLoading: boolean;
  saveBusy: boolean;
  deleteBusy: boolean;
  isDirty: boolean;
  selectedProduct: ProductItem | null;
  onCreateNewProduct: () => void;
  onUpdateProduct: (patch: Partial<ProductItem>) => void;
  onSaveChanges: () => void;
  onChooseImageClick: () => void;
  onBackToProducts: () => void;
  onToggleSaleStatus: () => void;
  onToggleStock: () => void;
  onResetForm: () => void;
  onDeleteConfirmed: () => void;
};

export function ProductDetailPanel({
  compactMode,
  productsLoading,
  saveBusy,
  deleteBusy,
  isDirty,
  selectedProduct,
  onCreateNewProduct,
  onUpdateProduct,
  onSaveChanges,
  onChooseImageClick,
  onBackToProducts,
  onToggleSaleStatus,
  onToggleStock,
  onResetForm,
  onDeleteConfirmed,
}: ProductDetailPanelProps) {
  const laptop1366IconHideClass = "[@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:hidden";
  const ipadMiniProductFormClass =
    "[@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-fit [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:max-h-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:content-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.84rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_label]:gap-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_label>span]:text-[0.78rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_input]:h-[38px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_input]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_input]:text-[0.84rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:min-h-[36px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:gap-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:text-[0.8rem]";
  const posWideShortProductFormClass =
    "[@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:w-[calc(100%+10px)] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!w-[calc(100%+28px)] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!h-full [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!grid-rows-[auto_1fr] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:overflow-visible [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:px-3.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:py-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.82rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_label]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_label>span]:text-[0.76rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_input]:h-[40px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_input]:px-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_input]:py-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_input]:text-[0.82rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:min-h-[44px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:px-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button:not(.stock-toggle-button)]:text-[0.76rem]";
  const detailPanelClass = `workspace-main-scroll grid w-[calc(100%+22px)] content-start gap-[10px] overflow-visible ${studioResponsiveClass.panelSurface} ${studioResponsiveClass.densePanelPadding} ${ipadMiniProductFormClass} ${posWideShortProductFormClass} [@media(width:1366px)_and_(height:768px)_and_(orientation:landscape)]:!w-[calc(100%+22px)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:w-[calc(100%+10px)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:w-full [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:overflow-y-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:overflow-x-hidden [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pr-3 [@media(min-width:1025px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:w-[calc(100%+10px)] [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-3 [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_label]:gap-2.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_label>span]:text-[0.9rem] [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:h-[46px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:px-3.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:text-[0.95rem] [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_button:not(.stock-toggle-button)]:min-h-[44px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(min-height:1000px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_button:not(.stock-toggle-button)]:text-[0.92rem] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:px-3.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:py-3.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_label]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_label>span]:text-[0.8rem] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:h-[40px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:px-3 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_input]:py-1.5 [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_button:not(.stock-toggle-button)]:min-h-[38px] [@media(min-width:1181px)_and_(max-width:1366px)_and_(max-height:999px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:[&_button:not(.stock-toggle-button)]:text-[0.82rem] max-[820px]:w-full`;
  const detailFieldRowClass = selectedProduct?.trackStock
    ? studioResponsiveClass.detailFieldRowWithStock
    : studioResponsiveClass.detailFieldRow;

  const [priceDraft, setPriceDraft] = useState<{ productId: string; value: string } | null>(null);
  const [costPerUnitDraft, setCostPerUnitDraft] = useState<{ productId: string; value: string } | null>(null);
  const [stockQuantityDraft, setStockQuantityDraft] = useState<{ productId: string; value: string } | null>(null);
  const [lowStockThresholdDraft, setLowStockThresholdDraft] = useState<{ productId: string; value: string } | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const priceInput =
    selectedProduct && priceDraft?.productId === selectedProduct.id ? priceDraft.value : selectedProduct ? String(selectedProduct.price) : "";
  const costPerUnitInput =
    selectedProduct && costPerUnitDraft?.productId === selectedProduct.id ? costPerUnitDraft.value : selectedProduct ? String(selectedProduct.costPerUnit) : "";
  const stockQuantityInput =
    selectedProduct && stockQuantityDraft?.productId === selectedProduct.id ? stockQuantityDraft.value : selectedProduct ? String(selectedProduct.stockQuantity) : "";
  const lowStockThresholdInput =
    selectedProduct && lowStockThresholdDraft?.productId === selectedProduct.id
      ? lowStockThresholdDraft.value
      : selectedProduct
        ? String(selectedProduct.lowStockThreshold)
        : "";
  const stockInvalid =
    Boolean(selectedProduct?.trackStock) &&
    ((!Number.isFinite(selectedProduct?.stockQuantity) || (selectedProduct?.stockQuantity ?? 0) < 0) ||
      (!Number.isFinite(selectedProduct?.lowStockThreshold) || (selectedProduct?.lowStockThreshold ?? 0) < 0));
  const isDraftEmpty =
    selectedProduct?.code === "DRAFT-NEW" &&
    !selectedProduct.name.trim() &&
    (selectedProduct.price === 0 || isNaN(selectedProduct.price)) &&
    selectedProduct.category === "อาหาร";
  const costInvalid = !Number.isFinite(selectedProduct?.costPerUnit) || (selectedProduct?.costPerUnit ?? 0) < 0;
  const isSaveDisabled = saveBusy || deleteBusy || !isDirty || !selectedProduct?.name?.trim() || (selectedProduct?.price ?? 0) <= 0 || costInvalid || stockInvalid;

  return (
    <section className={detailPanelClass}>
      <div className="grid gap-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-1.5">
        <div className={studioResponsiveClass.stackedHeader}>
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.62rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:tracking-[0.24em]">รายละเอียดสินค้า</p>
            <h2 className="my-[8px] text-[clamp(1.45rem,2.2vw,2rem)] leading-[0.98] tracking-[-0.06em] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:my-[5px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[1.32rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:my-[4px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[1.34rem]">
              {selectedProduct && selectedProduct.code === "DRAFT-NEW" ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}
            </h2>
          </div>
          {selectedProduct ? (
            <div className={`${studioResponsiveClass.detailToggleDock} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:translate-y-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:w-[180px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:min-h-[74px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:translate-y-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:content-start [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-2.5`}>
              <span className={selectedProduct.trackStock ? "inline-flex min-h-[40px] w-full whitespace-nowrap items-center justify-center gap-2 rounded-none border border-[var(--accent-border)] bg-[var(--accent-surface)] px-3 py-2 text-[0.78rem] font-bold text-[var(--accent-text)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[34px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.68rem]" : "inline-flex min-h-[40px] w-full whitespace-nowrap items-center justify-center gap-2 rounded-none border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-[0.78rem] font-bold text-[var(--foreground-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[34px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-1.5 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.68rem]"}>
                {selectedProduct.trackStock ? "ทำการเปิดสต๊อก" : "ทำการปิดสต๊อก"}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path fill="none" stroke="currentColor" strokeLinejoin="round" d="M1.583 4.5L8 1.583L14.417 4.5m-12.834 0L8 7.417M1.583 4.5v6.417L8 14.417m0-7L14.417 4.5M8 7.417v7M14.417 4.5v6.417L8 14.417M10.5 13V9.5m2 2.5V8.5" />
                </svg>
              </span>
              <button
                type="button"
                className="stock-toggle-button product-stock-toggle-button"
                role="switch"
                aria-checked={selectedProduct.trackStock}
                aria-label={selectedProduct.trackStock ? "ปิดสต๊อก" : "เปิดสต๊อก"}
                onClick={onToggleStock}
              >
                <span aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
        {selectedProduct ? (
          <div className={`${studioResponsiveClass.detailHeroGrid} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:mt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:grid-cols-[minmax(0,150px)_180px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:mt-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:grid-cols-[minmax(0,1fr)_180px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_180px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-3`}>
            <div className="min-w-0 max-[720px]:w-full">
              <div className={`${studioResponsiveClass.detailImageFrame} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-[132px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:h-[150px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:rounded-[12px]`}>
                {selectedProduct.imageUrl && canUseNextImage(selectedProduct.imageUrl) ? (
                  <Image
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    width={480}
                    height={232}
                    sizes="(max-width: 720px) 100vw, 312px"
                    className="block h-full w-full object-cover object-center"
                  />
                ) : selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="block h-full w-full object-cover object-center" decoding="async" />
                ) : (
                  <div className="h-full w-full bg-[var(--panel-subtle)]" />
                )}
              </div>
            </div>

            <div className={`${studioResponsiveClass.detailSidebar} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-[132px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pt-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:h-[150px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:pt-2`}>
              <div className="grid w-full justify-items-center pt-5 max-[720px]:pt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pt-0">
                <div
                  className={
                    selectedProduct.trackStock
                      ? "grid w-full justify-items-center gap-3 text-[0.78rem] font-bold text-[var(--success-bright)]"
                      : "grid w-full justify-items-center gap-3 text-[0.78rem] font-bold text-[var(--foreground-soft)]"
                  }
                >
                  <button
                    type="button"
                    className={`${primaryButtonClass} min-h-[40px] w-full rounded-none px-4 text-[0.95rem] disabled:cursor-not-allowed disabled:opacity-50 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:min-h-[34px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.78rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.76rem]`}
                    onClick={onCreateNewProduct}
                    disabled={saveBusy || deleteBusy || selectedProduct?.code === "DRAFT-NEW"}
                  >
                    เพิ่มสินค้าใหม่
                  </button>
                </div>
              </div>

              <Field label="ต้นทุน/ชิ้น">
                <input
                  type="number"
                  value={costPerUnitInput}
                  min="0"
                  onChange={(event) => {
                    const value = event.target.value;
                    setCostPerUnitDraft({ productId: selectedProduct.id, value });
                    const parsed = Number(value);
                    if (!Number.isNaN(parsed)) {
                      onUpdateProduct({ costPerUnit: Math.max(0, parsed) });
                    }
                  }}
                  onBlur={() => {
                    setCostPerUnitDraft(null);
                  }}
                  className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </div>

      {selectedProduct ? (
        <div className="-mt-3 pr-1 max-[720px]:mt-0 max-[720px]:pr-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:mt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:grid [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:content-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:pr-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:mt-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:pr-0 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:flex [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:flex-col">

          <div className="mt-3 grid gap-[10px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:mt-0 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:content-start [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-4 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:mt-0 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-2 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:flex-1 [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:content-between [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:mb-3">
            <div className={`${detailFieldRowClass} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-x-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-y-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_180px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_180px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-x-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-y-2`}>
              <Field label="ชื่อสินค้า" className="max-w-full">
                <input className={inputClass} value={selectedProduct.name} onChange={(event) => onUpdateProduct({ name: event.target.value })} />
              </Field>
              {selectedProduct.trackStock ? (
                <Field label="จำนวนคงเหลือ">
                  <input
                    type="number"
                    value={stockQuantityInput}
                    min="0"
                    onChange={(event) => {
                      const value = event.target.value;
                      setStockQuantityDraft({ productId: selectedProduct.id, value });
                      const parsed = Number(value);
                      if (!Number.isNaN(parsed)) {
                        onUpdateProduct({ stockQuantity: Math.max(0, parsed) });
                      }
                    }}
                    onBlur={() => {
                      setStockQuantityDraft(null);
                    }}
                    className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                </Field>
              ) : null}
            </div>

            <div className={`${detailFieldRowClass} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-x-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-y-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_180px] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!grid-cols-[minmax(0,1fr)_180px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-x-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-y-2`}>
              <Field label="ประเภทสินค้า">
                <div className="relative" ref={categoryRef}>
                  <button
                    type="button"
                    className={`${selectClass} text-left w-full pr-10 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!text-[0.72rem]`}
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                  >
                    <span className="block truncate">{selectedProduct.category}</span>
                  </button>
                  <div className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 flex items-center justify-center">
                    <span className="text-[0.6rem] text-[var(--foreground-soft)] transition-transform duration-200 block" style={{ transform: isCategoryOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      ▼
                    </span>
                  </div>
                  {isCategoryOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-dropdown)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex flex-col py-2">
                        {["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`flex items-center px-4 py-[10px] text-[0.95rem] transition-colors hover:bg-[var(--surface-muted)] active:bg-[var(--surface-strong)] ${selectedProduct.category === cat ? "text-[var(--brand)] font-bold bg-[var(--brand-soft)]" : "text-[var(--foreground)]"
                              }`}
                            onClick={() => {
                              onUpdateProduct({ category: cat as ProductItem["category"] });
                              setIsCategoryOpen(false);
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>
              {selectedProduct.trackStock ? (
                <Field label="แจ้งเตือนใกล้หมด">
                  <input
                    type="number"
                    value={lowStockThresholdInput}
                    min="0"
                    onChange={(event) => {
                      const value = event.target.value;
                      setLowStockThresholdDraft({ productId: selectedProduct.id, value });
                      const parsed = Number(value);
                      if (!Number.isNaN(parsed)) {
                        onUpdateProduct({ lowStockThreshold: Math.max(0, parsed) });
                      }
                    }}
                    onBlur={() => {
                      setLowStockThresholdDraft(null);
                    }}
                    className={`${inputClass} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                  />
                </Field>
              ) : null}
            </div>

            <div className="grid items-stretch gap-[10px] md:grid-cols-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-4 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-2">
              <div className="flex h-full min-w-0 flex-col gap-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-1.5">
                <Field label="ราคา">
                  <input
                    type="number"
                    value={priceInput}
                    min="0"
                    onChange={(e) => {
                      const val = e.target.value;
                      setPriceDraft({ productId: selectedProduct ? selectedProduct.id : "", value: val });
                      const parsed = Number(val);
                      if (!isNaN(parsed)) {
                        onUpdateProduct({ price: parsed });
                      }
                    }}
                    onBlur={() => {
                      setPriceDraft(null);
                    }}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-4 py-3 text-[0.96rem] text-[var(--foreground)] outline-none transition-all focus:border-[var(--brand)] focus:bg-[var(--surface-muted)] focus:shadow-[0_0_0_4px_var(--brand-soft)] [appearance:textfield] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:h-[38px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:px-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:py-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.84rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:h-[40px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:px-3 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:py-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.82rem] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </Field>

                <div className="mt-auto">
                  <button
                    type="button"
                    className={`${primaryButtonClass} whitespace-nowrap mb-3 min-h-[40px] w-full px-3 text-[0.95rem] shadow-none max-[1180px]:text-[0.86rem] disabled:opacity-50 disabled:cursor-not-allowed [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:mb-2 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!min-h-[40px] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.78rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:mb-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.74rem] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:!mb-[9px]`}
                    onClick={onSaveChanges}
                    disabled={isSaveDisabled}
                  >
                    {saveBusy ? (
                      <Loader size={18} label="กำลังบันทึก" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={`opacity-90 ${laptop1366IconHideClass}`}>
                        <g fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m15.078 5.626l.537-.843l-.537.843c.348.222.661.528 1.493 1.36l.707-.708l-.707.707l.954.954c.31.31.425.426.524.543a4 4 0 0 1 .938 2.264c.012.153.013.316.013.754v.5c0 1.417 0 2.419-.065 3.203c-.063.772-.182 1.243-.371 1.613a4 4 0 0 1-1.748 1.748c-.37.189-.841.308-1.613.371C14.419 19 13.417 19 12 19s-2.419 0-3.203-.065c-.771-.063-1.243-.182-1.613-.371a4 4 0 0 1-1.748-1.748c-.189-.37-.308-.841-.371-1.613C5 14.419 5 13.417 5 12v-.222c0-1.31 0-2.238.056-2.965c.054-.716.157-1.156.319-1.504a4 4 0 0 1 1.934-1.934c.348-.162.788-.265 1.504-.32C9.54 5.002 10.467 5 11.778 5c1.176 0 1.614.006 2.017.095c.455.1.89.28 1.283.531Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a2 2 0 1 0 0-4a2 2 0 0 0 0 4m2-9.5V7a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V5.2" />
                        </g>
                      </svg>
                    )}
                    {saveBusy ? "กำลังบันทึก..." : selectedProduct.code === "DRAFT-NEW" ? "บันทึกสินค้าใหม่" : "บันทึกการเปลี่ยนแปลง"}
                  </button>
                </div>
              </div>

              <div className="flex h-full flex-col gap-3 rounded-[14px] border border-[var(--border)] [background:var(--panel-elevated)] p-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:p-2.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-1.5 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:p-2">
                <span className="text-[0.92rem] font-semibold text-[var(--eyebrow)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.78rem]">รูปภาพสินค้า</span>
                <p className="m-0 text-[0.88rem] leading-[1.5] text-[var(--foreground-soft)] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:text-[0.72rem] [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:leading-[1.35] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.68rem] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:leading-[1.25]">
                  {compactMode ? "JPG, PNG, WEBP ไม่เกิน 5 MB" : "อัปโหลด JPG, PNG หรือ WEBP แล้วครอปเป็นรูปสี่เหลี่ยมจัตุรัส"}
                </p>

                <div className="mt-auto grid">
                  <button type="button" className={`${successButtonClass} whitespace-nowrap mt-auto [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:!min-h-[40px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:!min-h-[44px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:text-[0.74rem]`} onClick={onChooseImageClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className={`opacity-80 ${laptop1366IconHideClass}`}>
                      <g fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="14" height="14" x="5" y="5" rx="4" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5.14 15.32l3.55-3.754A1.75 1.75 0 0 1 9.969 11c.479 0 .938.204 1.277.566L15.387 16m-1.806-1.934l1.432-1.533a1.75 1.75 0 0 1 1.277-.566c.48 0 .939.204 1.277.566l1.274 1.43m-5.063-4.63h.009"
                        />
                      </g>
                    </svg>
                    เลือกรูปภาพสินค้า
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`${studioResponsiveClass.detailActionGrid} [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:mt-1 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:gap-3 [@media(min-width:821px)_and_(max-width:1024px)_and_(orientation:landscape)]:[&_button]:!min-h-[40px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:mt-1 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:gap-2 [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button]:!min-h-[44px] [@media(min-width:1181px)_and_(max-width:1280px)_and_(max-height:720px)_and_(orientation:landscape)]:[&_button]:text-[0.76rem] [@media(width:1280px)_and_(height:720px)_and_(orientation:landscape)]:mt-auto`}>
            <button
              type="button"
              className={`${secondaryButtonClass} disabled:opacity-40`}
              onClick={onBackToProducts}
              disabled={!isDirty}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9.333 13.667L6 10.333L9.333 7M6 10.333h9.167a3.333 3.333 0 0 1 0 6.667h-.834"
                />
              </svg>
              ย้อนกลับ
            </button>
            <button type="button" className={whiteButtonClass} onClick={onToggleSaleStatus}>
              {selectedProduct.status === "พร้อมขาย" ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80 text-[var(--danger)]">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m8 8l4 4m0 0l4 4m-4-4l4-4m-4 4l-4 4" />
                  </svg>
                  ปิดขาย
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80 text-[var(--success)]">
                    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m7 12l3.488 3.837a.2.2 0 0 0 .296 0L17 9" />
                  </svg>
                  เปิดขาย
                </>
              )}
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} disabled:opacity-40`}
              onClick={onResetForm}
              disabled={(!selectedProduct) || (selectedProduct.code !== "DRAFT-NEW") || isDraftEmpty}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m14.883 15.833l3.334-3.333m0 0l-3.334-3.333m3.334 3.333H10.05a3.333 3.333 0 0 0-3.333 3.333"
                />
              </svg>
              เคลียร์ฟอร์ม
            </button>
            <button
              type="button"
              className={`${dangerButtonClass} disabled:opacity-40`}
              onClick={onDeleteConfirmed}
              disabled={deleteBusy || saveBusy || (selectedProduct && selectedProduct.code === "DRAFT-NEW")}
            >
              {deleteBusy ? (
                <Loader size={18} label="กำลังลบ" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M18.133 7.723q.435.06.867.128m-.867-.128l-.906 9.68c-.037.434-.254.84-.607 1.136a2.02 2.02 0 0 1-1.297.461H8.677c-.48 0-.944-.164-1.297-.46a1.67 1.67 0 0 1-.607-1.138l-.906-9.679m12.266 0a45 45 0 0 0-2.951-.305m-9.315.305q-.435.06-.867.127m.867-.127a45 45 0 0 1 2.951-.305m6.364 0a45.5 45.5 0 0 0-6.364 0m6.364 0c0-2.114-1.455-3.07-3.182-3.07S8.818 5.44 8.818 7.418M10.5 15.5L10 11m4 0l-.5 4.5"
                  />
                </svg>
              )}
              ลบสินค้านี้
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid place-items-center rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-6 text-center">
          <div className="grid gap-3">
            {productsLoading ? (
              <LoadingState
                label="กำลังโหลดสินค้า..."
                description="ระบบกำลังดึงข้อมูลสินค้า"
              />
            ) : (
              <>
                <strong className="text-[1.08rem] tracking-[-0.03em] text-[var(--foreground)]">ยังไม่มีสินค้าในรายการ</strong>
                <p className="m-0 text-[0.92rem] leading-[1.6] text-[var(--foreground-soft)]">
                  เริ่มต้นด้วยการเพิ่มสินค้าใหม่ แล้วระบบจะเปิดฟอร์มแก้ไขให้อัตโนมัติ
                </p>
              </>
            )}
            {!productsLoading ? (
              <button
                type="button"
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={onCreateNewProduct}
                disabled={saveBusy || deleteBusy}
              >
                เพิ่มสินค้าใหม่
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}



