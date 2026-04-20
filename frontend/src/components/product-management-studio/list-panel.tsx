import { ghostButtonClass, Loader, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";
import { ProductImage } from "@/components/product-management-studio/shared";
import { categoryOptions, formatPrice, type ProductCategory, type ProductItem } from "@/components/product-management-studio/types";

type ProductListPanelProps = {
  activeCategory: ProductCategory;
  currentPage: number;
  filteredCount: number;
  itemsPerPage: number;
  productsLoading: boolean;
  selectedId: string;
  totalPages: number;
  visibleProducts: ProductItem[];
  onCategoryChange: (category: ProductCategory) => void;
  onPageChange: (updater: (current: number) => number) => void;
  onSelectProduct: (id: string) => void;
};

export function ProductListPanel({
  activeCategory,
  currentPage,
  filteredCount,
  itemsPerPage,
  productsLoading,
  selectedId,
  totalPages,
  visibleProducts,
  onCategoryChange,
  onPageChange,
  onSelectProduct,
}: ProductListPanelProps) {
  return (
    <div className="ml-auto grid w-[96%] gap-3 self-start max-[1180px]:w-full">
      <section className="grid grid-rows-[auto_auto_auto] self-start overflow-hidden rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)] backdrop-blur-[14px] max-[1180px]:px-4 max-[1180px]:py-4">
        <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">รายการสินค้าทั้งหมด</p>
            <h2 className="mb-0 mt-[8px] text-[clamp(1.45rem,2vw,2rem)] leading-[1.02] tracking-[-0.06em]">เลือกสินค้าเพื่อแก้ไขได้ทันที</h2>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch">
            <StatusPill>หน้า {currentPage}/{totalPages}</StatusPill>
            <StatusPill>{filteredCount} รายการ</StatusPill>
          </div>
        </div>

        <div className="flex flex-wrap gap-[10px] pt-3">
          {categoryOptions.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                className={
                  active
                    ? "min-h-10 rounded-[10px] border border-[rgba(108,92,231,0.5)] bg-[rgba(108,92,231,0.14)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[rgba(108,92,231,0.1)_0_6px_12px] transition hover:-translate-y-px"
                    : "min-h-10 rounded-[10px] border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
                }
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="mt-3 pr-1 pt-1">
          <div className="grid gap-[10px]">
            {visibleProducts.map((item) => {
              const active = item.id === selectedId;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    active
                      ? "mx-auto grid min-h-[124px] w-[97%] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[rgba(108,92,231,0.5)] bg-[rgba(108,92,231,0.08)] px-3 py-3 text-left shadow-[rgba(108,92,231,0.08)_0_6px_12px] transition hover:-translate-y-px"
                      : "mx-auto grid min-h-[124px] w-[97%] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.58)] px-3 py-3 text-left transition hover:-translate-y-px hover:shadow-[rgba(0,0,0,0.1)_0_4px_8px]"
                  }
                  onClick={() => onSelectProduct(item.id)}
                >
                  <ProductImage
                    product={item}
                    className="h-[74px] w-[74px] rounded-[18px] border border-[rgba(100,120,160,0.14)] object-cover max-[1180px]:h-[62px] max-[1180px]:w-[62px]"
                    fallbackClassName="grid h-[74px] w-[74px] place-items-center rounded-[18px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)] max-[1180px]:h-[62px] max-[1180px]:w-[62px]"
                  />

                  <div className="min-w-0 self-start">
                    <strong className="block text-[1rem] tracking-[-0.03em] text-white">{item.name}</strong>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">{item.category}</span>
                      <StatusPill tone={item.status === "พร้อมขาย" ? "success" : "ghost"}>{item.status}</StatusPill>
                    </div>
                    <p className="mt-1.5 text-[0.88rem] text-[#6b7a94]">{item.code}</p>
                  </div>

                  <div className="self-center whitespace-nowrap pl-2 text-[1rem] font-normal text-[#a0b8d8]">{formatPrice(item.price)}</div>
                </button>
              );
            })}

            {productsLoading && visibleProducts.length === 0 ? (
              <div className="grid place-items-center rounded-[16px] border border-dashed border-[var(--border)] bg-[rgba(18,22,34,0.72)] px-4 py-6 text-center">
                <div className="grid gap-3">
                  <Loader className="mx-auto" label="กำลังโหลดสินค้า" />
                  <strong className="text-[1rem] tracking-[-0.03em] text-white">กำลังโหลดรายการสินค้า...</strong>
                </div>
              </div>
            ) : null}

            {!productsLoading && visibleProducts.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[rgba(18,22,34,0.72)] px-4 py-5 text-[0.92rem] text-[var(--foreground-soft)]">
                ยังไม่มีสินค้าในหมวดนี้
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex max-w-full items-center justify-between gap-3 px-2 py-1 max-[720px]:flex-col max-[720px]:items-stretch">
        <button
          type="button"
          className={ghostButtonClass}
          disabled={currentPage <= 1}
          onClick={() => onPageChange((current) => Math.max(1, current - 1))}
        >
          ก่อนหน้า
        </button>
        <span className="text-[0.92rem] text-[var(--foreground-soft)]">แสดงสูงสุด {itemsPerPage} สินค้าต่อหน้า</span>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange((current) => Math.min(totalPages, current + 1))}
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
}
