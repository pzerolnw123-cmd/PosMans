import { useState } from "react";
import Image from "next/image";
import {
  dangerButtonClass,
  ghostButtonClass,
  inputClass,
  Loader,
  primaryButtonClass,
  secondaryButtonClass,
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
  const priceInput =
    selectedProduct && priceDraft?.productId === selectedProduct.id ? priceDraft.value : selectedProduct ? String(selectedProduct.price) : "";
  const isSaveDisabled = saveBusy || deleteBusy || !isDirty || !selectedProduct?.name?.trim() || (selectedProduct?.price ?? 0) <= 0;

  return (
    <section className="grid w-[calc(100%+22px)] min-h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-[14px] max-[1180px]:w-full max-[1180px]:px-4 max-[1180px]:py-4">
      <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">รายละเอียดสินค้า</p>
          <h2 className="my-[8px] text-[clamp(1.45rem,2.2vw,2.6rem)] leading-[0.98] tracking-[-0.06em]">
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

              <button type="button" className={`${primaryButtonClass} min-h-[46px] rounded-[12px] px-4`} onClick={onCreateNewProduct}>
                เพิ่มสินค้าใหม่
              </button>
            </div>

            <Field label="ประเภทสินค้า">
              <div className="relative">
                <select
                  className={selectClass}
                  value={selectedProduct.category}
                  onChange={(event) => onUpdateProduct({ category: event.target.value as ProductItem["category"] })}
                >
                  <option value="อาหาร">อาหาร</option>
                  <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                  <option value="ของหวาน/ขนม">ของหวาน/ขนม</option>
                  <option value="รองเท้า">รองเท้า</option>
                  <option value="อะไหล่ / อุปกรณ์เสริม">อะไหล่ / อุปกรณ์เสริม</option>
                </select>
                <span className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-[0.9rem] text-[var(--foreground-soft)]">
                  ▼
                </span>
              </div>
            </Field>

            <div className="grid items-stretch gap-[10px] md:grid-cols-2">
              <div className="flex h-full min-w-0 flex-col gap-2">
                <Field label="ราคา">
                  <input
                    className={inputClass}
                    type="number"
                    value={priceInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setPriceDraft({ productId: selectedProduct.id, value: nextValue });

                      if (nextValue === "") {
                        return;
                      }

                      const nextPrice = Number(nextValue);
                      if (Number.isFinite(nextPrice)) {
                        onUpdateProduct({ price: nextPrice });
                        setPriceDraft(null);
                      }
                    }}
                  />
                </Field>

                <div className="mt-auto">
                  <button
                    type="button"
                    className={`${primaryButtonClass} mb-3 min-h-[40px] w-full px-3 text-[0.95rem] shadow-none max-[1180px]:text-[0.86rem] disabled:opacity-50 disabled:cursor-not-allowed`}
                    onClick={onSaveChanges}
                    disabled={isSaveDisabled}
                  >
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
                  <button type="button" className={`${secondaryButtonClass} mt-auto`} onClick={onChooseImageClick}>
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
              ย้อนกลับ
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onToggleSaleStatus}>
              {selectedProduct.status === "พร้อมขาย" ? "ปิดขาย" : "เปิดขาย"}
            </button>
            <button
              type="button"
              className={`${secondaryButtonClass} disabled:opacity-40`}
              onClick={onResetForm}
              disabled={selectedProduct && selectedProduct.code !== "DRAFT-NEW"}
            >
              เคลียร์ฟอร์ม
            </button>
            <button
              type="button"
              className={`${dangerButtonClass} disabled:opacity-40`}
              onClick={onDeleteConfirmed}
              disabled={deleteBusy || saveBusy || (selectedProduct && selectedProduct.code === "DRAFT-NEW")}
            >
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
              <button type="button" className={primaryButtonClass} onClick={onCreateNewProduct}>
                เพิ่มสินค้าใหม่
              </button>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
