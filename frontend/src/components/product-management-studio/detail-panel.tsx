import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  dangerButtonClass,
  ghostButtonClass,
  inputClass,
  Loader,
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
  whiteButtonClass,
  selectClass,
  StatusPill,
} from "@/components/ui-primitives";
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
  onResetForm,
  onDeleteConfirmed,
}: ProductDetailPanelProps) {
  const [priceDraft, setPriceDraft] = useState<{ productId: string; value: string } | null>(null);
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
  const isDraftEmpty = 
    selectedProduct?.code === "DRAFT-NEW" &&
    !selectedProduct.name.trim() &&
    (selectedProduct.price === 0 || isNaN(selectedProduct.price)) &&
    selectedProduct.category === "อาหาร";
  const isSaveDisabled = saveBusy || deleteBusy || !isDirty || !selectedProduct?.name?.trim() || (selectedProduct?.price ?? 0) <= 0;

  return (
    <section className="grid w-[calc(100%+22px)] min-h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-[14px] max-[1180px]:w-full max-[1180px]:px-4 max-[1180px]:py-4">
      <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">รายละเอียดสินค้า</p>
          <h2 className="my-[8px] text-[clamp(1.45rem,2.2vw,2rem)] leading-[0.98] tracking-[-0.06em]">
            {selectedProduct && selectedProduct.code === "DRAFT-NEW" ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}
          </h2>
        </div>
        <StatusPill>โหมดแก้ไข</StatusPill>
      </div>

      {selectedProduct ? (
        <div className="min-h-0 overflow-auto pr-1">
          <div className="mt-[10px] h-[178px] overflow-hidden rounded-[18px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)] max-[1180px]:h-[108px]">
            {selectedProduct.imageUrl && canUseNextImage(selectedProduct.imageUrl) ? (
              <Image
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                width={900}
                height={360}
                sizes="(max-width: 1180px) 100vw, 48vw"
                className="block h-full w-full object-cover object-center"
              />
            ) : selectedProduct.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="block h-full w-full object-cover object-center" decoding="async" />
            ) : (
              <div className="h-full w-full bg-[rgba(255,255,255,0.02)]" />
            )}
          </div>

          <div className="mt-3 grid gap-[10px]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 max-[720px]:grid-cols-1">
              <Field label="ชื่อสินค้า" className="max-w-full">
                <input className={inputClass} value={selectedProduct.name} onChange={(event) => onUpdateProduct({ name: event.target.value })} />
              </Field>

              <button
                type="button"
                className={`${primaryButtonClass} min-h-[46px] rounded-[12px] px-4 disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={onCreateNewProduct}
                disabled={saveBusy || deleteBusy || (selectedProduct && selectedProduct.code === "DRAFT-NEW")}
              >
                เพิ่มสินค้าใหม่
              </button>
            </div>

            <Field label="ประเภทสินค้า">
              <div className="relative" ref={categoryRef}>
                <button
                  type="button"
                  className={`${selectClass} text-left w-full pr-10`}
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
                  <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-[16px] border border-[var(--border)] bg-[rgba(22,27,38,0.95)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex flex-col py-2">
                      {["อาหาร", "เครื่องดื่ม", "ของหวาน/ขนม", "รองเท้า", "อะไหล่ / อุปกรณ์เสริม"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`flex items-center px-4 py-[10px] text-[0.95rem] transition-colors hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.02)] ${
                            selectedProduct.category === cat ? "text-[rgba(108,92,231,1)] font-bold bg-[rgba(108,92,231,0.08)]" : "text-[rgba(255,255,255,0.8)]"
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

            <div className="grid items-stretch gap-[10px] md:grid-cols-2">
              <div className="flex h-full min-w-0 flex-col gap-2">
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
                    className="w-full rounded-xl border border-[rgba(100,120,160,0.12)] bg-[rgba(22,27,38,0.56)] px-4 py-3 text-[0.96rem] text-white outline-none transition-all focus:border-[var(--primary)] focus:bg-[rgba(22,27,38,0.8)] focus:shadow-[0_0_0_4px_rgba(108,92,231,0.1)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </Field>

                <div className="mt-auto">
                  <button
                    type="button"
                    className={`${primaryButtonClass} mb-3 min-h-[40px] w-full px-3 text-[0.95rem] shadow-none max-[1180px]:text-[0.86rem] disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={onSaveChanges}
                    disabled={isSaveDisabled}
                  >
                    {saveBusy ? (
                      <Loader size={18} label="กำลังบันทึก" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-90">
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

              <div className="flex h-full flex-col gap-3 rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,25,36,0.78),rgba(16,20,30,0.82))] p-3">
                <span className="text-[0.92rem] font-semibold text-[#6b7a94]">รูปภาพสินค้า</span>
                <p className="m-0 text-[0.88rem] leading-[1.5] text-[var(--foreground-soft)]">
                  {compactMode ? "JPG, PNG, WEBP ไม่เกิน 5 MB" : "อัปโหลด JPG, PNG หรือ WEBP แล้วครอปเป็นรูปสี่เหลี่ยมจัตุรัส"}
                </p>

                <div className="mt-auto grid">
                  <button type="button" className={`${successButtonClass} mt-auto`} onClick={onChooseImageClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
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

          <div className="mt-[10px] grid gap-[10px] sm:grid-cols-2 xl:grid-cols-2">
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
        <div className="mt-4 grid place-items-center rounded-[16px] border border-dashed border-[var(--border)] bg-[rgba(18,22,34,0.72)] p-6 text-center">
          <div className="grid gap-3">
            {productsLoading ? <Loader className="mx-auto" label="กำลังโหลดสินค้า" /> : null}
            <strong className="text-[1.08rem] tracking-[-0.03em] text-white">{productsLoading ? "กำลังโหลดสินค้า..." : "ยังไม่มีสินค้าในรายการ"}</strong>
            <p className="m-0 text-[0.92rem] leading-[1.6] text-[var(--foreground-soft)]">
              {productsLoading ? "ระบบกำลังดึงข้อมูลสินค้าจาก backend" : "เริ่มต้นด้วยการเพิ่มสินค้าใหม่ แล้วระบบจะเปิดฟอร์มแก้ไขให้อัตโนมัติ"}
            </p>
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
