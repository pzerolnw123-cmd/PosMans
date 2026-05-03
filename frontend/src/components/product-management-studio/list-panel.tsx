import { ghostButtonClass, LoadingState, secondaryButtonClass, StatusPill } from "@/components/ui-primitives";
import { studioResponsiveClass } from "@/components/product-management-studio/layout-classes";
import { ProductImage } from "@/components/product-management-studio/shared";
import { categoryOptions, formatPrice, type ProductCategory, type ProductItem } from "@/components/product-management-studio/types";

type ProductListPanelProps = {
  activeCategory: ProductCategory;
  currentPage: number;
  filteredCount: number;
  itemsPerPage: number;
  productsLoading: boolean;
  selectedId: string;
  selectionTransitionLocked?: boolean;
  totalPages: number;
  visibleProducts: ProductItem[];
  onCategoryChange: (category: ProductCategory) => void;
  onPageChange: (updater: (current: number) => number) => void;
  onSelectProduct: (id: string) => void;
};

function displaySaleStatus(product: ProductItem) {
  if (product.status === "พร้อมขาย" && product.trackStock && product.stockQuantity <= 0) {
    return "ปิดขาย";
  }

  return product.status;
}

export function ProductListPanel({
  activeCategory,
  currentPage,
  filteredCount,
  itemsPerPage,
  productsLoading,
  selectedId,
  selectionTransitionLocked = false,
  totalPages,
  visibleProducts,
  onCategoryChange,
  onPageChange,
  onSelectProduct,
}: ProductListPanelProps) {
  const listPanelClass = `grid grid-rows-[auto_auto_auto] self-start overflow-hidden ${studioResponsiveClass.panelSurface} ${studioResponsiveClass.panelPadding}`;
  const ipadAirCardWidthClass =
    "[@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:!w-[97%] [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:!w-[97%]";

  return (
    <div className="ml-auto grid w-[96%] gap-3 self-start max-[820px]:w-full max-[820px]:gap-4">
      <section className={listPanelClass}>
        <div className={studioResponsiveClass.stackedHeader}>
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">รายการสินค้าทั้งหมด</p>
            <h2 className="mb-0 mt-[8px] text-[clamp(1.45rem,2vw,2rem)] leading-[1.02] tracking-[-0.06em]">เลือกสินค้าเพื่อแก้ไขได้ทันที</h2>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch">
            <StatusPill>หน้า {currentPage}/{totalPages}</StatusPill>
            <StatusPill>{filteredCount} รายการ</StatusPill>
          </div>
        </div>

        <div className={studioResponsiveClass.chipGrid}>
          {categoryOptions.map((category) => {
            const active = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                className={
                  active
                    ? "min-h-10 rounded-[10px] border border-[var(--brand)] bg-[var(--brand-soft)] px-[18px] font-bold text-[var(--brand-strong)] shadow-[var(--brand-shadow)] transition hover:-translate-y-px"
                    : "min-h-10 rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:shadow-[var(--shadow-hover-subtle)]"
                }
                onClick={() => onCategoryChange(category)}
              >
                <div className="flex items-center gap-[10px]">
                  {category === "อาหาร" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20">
                      <path
                        fill="currentColor"
                        d="M4.67 2c-.624 0-1.175.438-1.29 1.068C3.232 3.886 3 5.342 3 6.5c0 1.231.636 2.313 1.595 2.936c.271.177.405.405.405.6v.41q0 .027-.003.054c-.027.26-.151 1.429-.268 2.631C4.614 14.316 4.5 15.581 4.5 16a2 2 0 1 0 4 0c0-.42-.114-1.684-.229-2.869a302 302 0 0 0-.268-2.63L8 10.446v-.41c0-.196.134-.424.405-.6A3.5 3.5 0 0 0 10 6.5c0-1.158-.232-2.614-.38-3.432A1.305 1.305 0 0 0 8.33 2c-.34 0-.65.127-.884.336A1.5 1.5 0 0 0 6.5 2c-.359 0-.688.126-.946.336A1.32 1.32 0 0 0 4.671 2M6 3.5a.5.5 0 0 1 1 0v3a.5.5 0 0 0 1 0V3.33A.33.33 0 0 1 8.33 3c.157 0 .28.108.306.247C8.783 4.06 9 5.439 9 6.5a2.5 2.5 0 0 1-1.14 2.098c-.439.285-.86.786-.86 1.438v.41q0 .08.008.16c.028.258.151 1.424.268 2.622c.118 1.215.224 2.415.224 2.772a1 1 0 1 1-2 0c0-.357.106-1.557.224-2.772c.117-1.198.24-2.364.268-2.622q.008-.08.008-.16v-.41c0-.652-.421-1.153-.86-1.438A2.5 2.5 0 0 1 4 6.5c0-1.06.217-2.44.364-3.253A.305.305 0 0 1 4.671 3A.33.33 0 0 1 5 3.33V6.5a.5.5 0 0 0 1 0zm5 3A4.5 4.5 0 0 1 15.5 2a.5.5 0 0 1 .5.5v6.978l.02.224a626 626 0 0 1 .228 2.696c.124 1.507.252 3.161.252 3.602a2 2 0 1 1-4 0c0-.44.128-2.095.252-3.602c.062-.761.125-1.497.172-2.042l.03-.356H12.5A1.5 1.5 0 0 1 11 8.5zm2.998 3.044l-.021.245l-.057.653c-.047.544-.11 1.278-.172 2.038c-.126 1.537-.248 3.132-.248 3.52a1 1 0 1 0 2 0c0-.388-.122-1.983-.248-3.52a565 565 0 0 0-.229-2.691l-.021-.244v-.001L15 9.5V3.035A3.5 3.5 0 0 0 12 6.5v2a.5.5 0 0 0 .5.5h1a.5.5 0 0 1 .498.544"
                      />
                    </svg>
                  )}
                  {category === "เครื่องดื่ม" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 64 64">
                      <path
                        fill="currentColor"
                        d="M52.197 33.742c-.09.027-.229.051-.381.072c.196-1.235.31-2.227.366-2.846c.036-.242.056-.484.061-.775c0-4.07-4.643-7.565-11.745-9.522c.628-1.688.689-3.801-1.292-5.829C36.483 12.057 38.295 8 38.295 8s-5.72 5.363-2.107 9.061c1.127 1.154 1.79 2.186 2.171 3.084c-2.475-.539-5.19-.902-8.071-1.057c.722-2.261.666-5.025-1.848-7.679C24.809 7.579 27.224 2 27.224 2s-7.625 7.374-2.81 12.458c1.629 1.719 2.532 3.242 3.015 4.545L27.121 19c-2.793 0-5.464.196-7.954.555c.252-1.457-.037-3.112-1.601-4.712C14.843 12.058 16.654 8 16.654 8s-5.719 5.363-2.107 9.061c1.061 1.085 1.716 2.065 2.106 2.925C7.936 21.726 1.999 25.604 2 30.241c.002.241.024.479.051.671c.26 2.825 1.545 12.682 7.198 20.977c1.31 1.926 3.275 3.906 5.813 5.518c.574.816 1.44 1.734 2.769 2.582C19.129 60.813 22.218 62 27.12 62c4.905 0 7.994-1.188 9.29-2.012c1.325-.846 2.192-1.762 2.766-2.578a20.9 20.9 0 0 0 4.497-3.822a.44.44 0 0 0 .18-.07C48.869 49.307 62 47.646 62 39.777c0-4.97-3.278-7.955-9.803-6.035M27.121 58.846c-7.923 0-13.591-4.182-16.255-8.094c-5.381-7.897-6.607-17.324-6.861-20.072a4 4 0 0 1-.039-.487c0-3.262 5.033-6.685 13.189-8.276c.073 1.333-.501 2.083-.501 2.083s.987-.913 1.745-2.305A53.4 53.4 0 0 1 27.121 21c.261 0 .508.013.764.017c.136 1.908-.661 2.983-.661 2.983s1.216-1.162 2.207-2.951c3.481.137 6.633.578 9.37 1.235c-.037 1.102-.506 1.716-.506 1.716s.623-.584 1.258-1.519c6.687 1.753 10.723 4.803 10.722 7.74c-.001.151-.016.3-.044.505c-.233 2.542-1.332 11.03-5.94 18.604a28 28 0 0 0-1.157 1.758c-2.754 3.812-8.315 7.758-16.013 7.758m32.134-17.547c-1.738 2.672-7.597 3.951-11.328 5.398a46 46 0 0 0 2.573-6.949l.494-.117s.268-1.541 1.542-2.699c1.633-1.48 7.143-1.156 7.143 2.453c0 .691-.156 1.326-.424 1.914"
                      />
                      <path
                        fill="currentColor"
                        d="M48.619 31.693c-2.07-4.291-10.905-7.516-21.498-7.516c-10.592 0-19.427 3.225-21.502 7.516c2.075 4.292 10.91 7.518 21.502 7.518c10.593 0 19.428-3.227 21.498-7.518m-9.678 2.104s-8.018 4.295-19.429 4.295c0 0 2.873-1.318 0-2.482c-4.557-1.67-9.097-3.991-7.133-6.454c3.136-3.922 13.401-2.336 14.74-.209c.974-1.996 11.5-3.789 14.742.207c1.325 1.635-.313 3.246-2.92 4.643"
                      />
                      <path
                        fill="currentColor"
                        d="M26.801 30.244c-.762-1.703-7.432-3.07-9.723.016c-1.433 1.934 1.425 3.823 4.33 5.196c1.826.955-.144 1.971-.144 1.971c7.515.117 13.045-3.211 13.045-3.211h-.002c1.798-1.08 2.97-2.342 2.19-3.655c-1.905-3.206-8.942-1.892-9.696-.317m4.997 3.924s-3.701 2.229-8.73 2.15c0 0 1.317-.682.097-1.318c-1.945-.92-3.859-2.186-2.897-3.481c1.531-2.063 5.998-1.148 6.505-.008c.507-1.055 5.215-1.936 6.491.211c.522.879-.262 1.723-1.466 2.446"
                      />
                    </svg>
                  )}
                  {category === "ของหวาน/ขนม" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 1024 1024">
                      <path
                        fill="currentColor"
                        d="M128 416v-48a144 144 0 0 1 168.6-141.9a224.1 224.1 0 0 1 430.8 0A144 144 0 0 1 896 368v48a384 384 0 0 1-352 382.7V896h-64v-97.3A384 384 0 0 1 128 416m287.1-32h193.8a144 144 0 0 1 58.9-132.8a160 160 0 0 0-311.6 0A144 144 0 0 1 415.1 384m-72.9 0a72 72 0 1 0-140.5 0zm339.6 0h140.4a72 72 0 1 0-140.5 0zM512 736a320 320 0 0 0 318.4-288H193.6A320 320 0 0 0 512 736M384 896h256a32 32 0 1 1 0 64H384a32 32 0 1 1 0-64"
                      />
                    </svg>
                  )}
                  {category === "รองเท้า" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                      <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5">
                        <path
                          strokeLinecap="round"
                          d="M19.101 18H7.963c-2.934 0-4.4 0-5.295-1.117c-1.697-2.12.237-7.76 1.408-9.883c.397 2.4 4.486 2.333 5.975 2c-.992-1.999.332-2.666.994-3h.002c2.953 3.5 9.268 5.404 10.815 9.219c.669 1.648-1.236 2.781-2.76 2.781"
                        />
                        <path d="M2 14c4.165 1.43 6.731 1.844 10.022.804c.997-.315 1.495-.473 1.806-.452c.31.022.945.317 2.213.909c1.583.738 3.756 1.163 5.959.097" />
                        <path strokeLinecap="round" d="M13.5 9.5L15 8m.5 3L17 9.5" />
                      </g>
                    </svg>
                  )}
                  {category === "อะไหล่ / อุปกรณ์เสริม" && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32">
                      <path
                        fill="currentColor"
                        d="M23.981 24.433A3.96 3.96 0 0 0 26 25a4.005 4.005 0 0 0 4-4a4 4 0 0 0-.15-1.023l-2.436 2.437a2 2 0 1 1-2.828-2.828l2.437-2.437A4 4 0 0 0 26 17a4.005 4.005 0 0 0-4 4a3.95 3.95 0 0 0 .567 2.02L17 28.585L18.414 30Z"
                      />
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M26 4h-4V2h-2v2h-8V2h-2v2H6a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h8v-2H6V6h4v2h2V6h8v2h2V6h4v8h2V6a2 2 0 0 0-2-2"
                      />
                    </svg>
                  )}
                  {category}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 pr-1 pt-1">
          <div className="grid gap-[10px]">
            {visibleProducts.map((item) => {
              const active = item.id === selectedId;
              const saleStatusLabel = displaySaleStatus(item);
              const stockLabel = item.trackStock
                ? item.stockQuantity <= 0
                  ? "หมด"
                  : item.lowStockThreshold > 0 && item.stockQuantity <= item.lowStockThreshold
                    ? `ใกล้หมด ${item.stockQuantity}`
                    : `เหลือ ${item.stockQuantity}`
                : null;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    active
                      ? `mx-auto ${studioResponsiveClass.listCardGrid} ${ipadAirCardWidthClass} min-h-[124px] w-full rounded-[18px] border border-[var(--brand)] bg-[var(--brand-soft)] px-3 py-3 text-left shadow-[var(--brand-shadow)] transition hover:-translate-y-px`
                      : selectionTransitionLocked
                        ? `mx-auto ${studioResponsiveClass.listCardGrid} ${ipadAirCardWidthClass} min-h-[124px] w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left`
                        : `mx-auto ${studioResponsiveClass.listCardGrid} ${ipadAirCardWidthClass} min-h-[124px] w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition hover:-translate-y-px hover:shadow-[var(--shadow-hover-subtle)]`
                  }
                  onClick={() => onSelectProduct(item.id)}
                >
                  <ProductImage
                    product={item}
                    className={studioResponsiveClass.listCardImage}
                    fallbackClassName={studioResponsiveClass.listCardImageFallback}
                  />

                  <div className="min-w-0 self-center">
                    <strong className="block text-[1rem] tracking-[-0.03em] text-[var(--foreground)] [overflow-wrap:anywhere]">
                      {item.name}
                      {stockLabel ? (
                        <span className="ml-2 text-[0.82rem] font-bold text-[var(--foreground)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:hidden [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:hidden">
                          ({stockLabel})
                        </span>
                      ) : null}
                    </strong>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">{item.category}</span>
                    </div>
                    <p className="mt-1.5 text-[0.88rem] text-[var(--eyebrow)]">{item.code}</p>
                  </div>

                  <div className="flex flex-col items-end self-center whitespace-nowrap pl-2 max-[520px]:col-span-2 max-[520px]:items-start max-[520px]:pl-0">
                    <div className="text-[1.05rem] font-bold text-[var(--foreground)]">{formatPrice(item.price)}</div>
                    <div className="mt-2">
                      <StatusPill tone={saleStatusLabel === "พร้อมขาย" ? "success" : "ghost"}>{saleStatusLabel}</StatusPill>
                    </div>
                    {stockLabel ? (
                      <span className="mt-1 hidden text-[0.78rem] font-bold text-[var(--foreground-soft)] [@media(min-width:768px)_and_(max-width:820px)_and_(orientation:portrait)_and_(any-pointer:coarse)]:block [@media(min-width:821px)_and_(max-width:1180px)_and_(orientation:landscape)_and_(any-pointer:coarse)]:block">
                        {stockLabel}
                      </span>
                    ) : null}
                  </div>                </button>
              );
            })}

            {productsLoading && visibleProducts.length === 0 ? (
              <div className="grid place-items-center rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-6 text-center">
                <LoadingState
                  label="กำลังโหลดรายการสินค้า..."
                  description="ระบบกำลังดึงข้อมูลสินค้า"
                />
              </div>
            ) : null}

            {!productsLoading && visibleProducts.length === 0 ? (
              <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-[0.92rem] text-[var(--foreground-soft)]">
                ยังไม่มีสินค้าในหมวดนี้
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className={studioResponsiveClass.stackedFooter}>
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
