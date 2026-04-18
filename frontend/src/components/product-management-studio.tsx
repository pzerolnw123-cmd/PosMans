"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  StatusPill,
  dangerButtonClass,
  ghostButtonClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-primitives";

type ProductCategory = "ทั้งหมด" | "อาหาร" | "เครื่องดื่ม" | "เบเกอรี";
type ProductAccent = "noodle" | "fried" | "bakery" | "dessert" | "drink";

type ProductItem = {
  id: string;
  code: string;
  name: string;
  category: Exclude<ProductCategory, "ทั้งหมด">;
  price: number;
  status: "พร้อมขาย" | "ใกล้หมด";
  accent: ProductAccent;
  illustration: string;
};

const categoryOptions: ProductCategory[] = ["ทั้งหมด", "อาหาร", "เครื่องดื่ม", "เบเกอรี"];

const accentStyles: Record<ProductAccent, { banner: string; thumb: string }> = {
  noodle: {
    banner:
      "border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(90,65,30,0.7),rgba(70,48,25,0.8)_55%,rgba(55,38,20,0.85)_100%)]",
    thumb:
      "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(70,52,28,0.98),rgba(50,36,18,0.98))]",
  },
  fried: {
    banner:
      "border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(85,60,28,0.7),rgba(68,45,22,0.8)_55%,rgba(50,35,18,0.85)_100%)]",
    thumb:
      "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(65,48,25,0.98),rgba(48,32,16,0.98))]",
  },
  bakery: {
    banner:
      "border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(82,62,32,0.7),rgba(65,48,26,0.8)_55%,rgba(52,38,20,0.85)_100%)]",
    thumb:
      "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(68,50,28,0.98),rgba(50,38,20,0.98))]",
  },
  dessert: {
    banner:
      "border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(78,58,28,0.7),rgba(60,44,22,0.8)_55%,rgba(48,34,18,0.85)_100%)]",
    thumb:
      "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(62,46,24,0.98),rgba(45,32,16,0.98))]",
  },
  drink: {
    banner:
      "border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(85,55,25,0.7),rgba(65,40,20,0.8)_55%,rgba(52,30,16,0.85)_100%)]",
    thumb:
      "bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_36%),linear-gradient(180deg,rgba(65,42,20,0.98),rgba(48,28,14,0.98))]",
  },
};

const initialProducts: ProductItem[] = [
  {
    id: "food-002",
    code: "FOOD-002",
    name: "ขนมจีนน้ำยาป่า",
    category: "อาหาร",
    price: 52,
    status: "พร้อมขาย",
    accent: "noodle",
    illustration: "ข",
  },
  {
    id: "food-003",
    code: "FOOD-003",
    name: "ทอดมันกุ้ง",
    category: "อาหาร",
    price: 60,
    status: "พร้อมขาย",
    accent: "fried",
    illustration: "ท",
  },
  {
    id: "bakery-002",
    code: "BAKERY-002",
    name: "ไข่หวาน",
    category: "เบเกอรี",
    price: 45,
    status: "พร้อมขาย",
    accent: "bakery",
    illustration: "ไข่",
  },
  {
    id: "bakery-001",
    code: "BAKERY-001",
    name: "ขนมครก",
    category: "เบเกอรี",
    price: 54,
    status: "พร้อมขาย",
    accent: "dessert",
    illustration: "ขค",
  },
  {
    id: "drink-001",
    code: "DRINK-001",
    name: "ชาไทยเย็น",
    category: "เครื่องดื่ม",
    price: 55,
    status: "ใกล้หมด",
    accent: "drink",
    illustration: "ชา",
  },
];

function makeNewProduct(): ProductItem {
  return {
    id: `draft-${Date.now()}`,
    code: "DRAFT-NEW",
    name: "สินค้าใหม่",
    category: "อาหาร",
    price: 0,
    status: "พร้อมขาย",
    accent: "noodle",
    illustration: "ใหม่",
  };
}

function formatPrice(value: number) {
  return `THB ${value}`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-[8px] max-[1180px]:gap-[6px]">
      <span className="text-[0.92rem] font-semibold text-[#6b7a94]">{label}</span>
      {children}
    </label>
  );
}

export function ProductManagementStudio() {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [activeCategory, setActiveCategory] = useState<ProductCategory>("ทั้งหมด");
  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? "");
  const [page, setPage] = useState(1);
  const [compactMode, setCompactMode] = useState(false);
  const itemsPerPage = compactMode ? 3 : 4;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1181px) and (max-height: 860px)");
    const syncCompactMode = () => setCompactMode(mediaQuery.matches);

    syncCompactMode();
    mediaQuery.addEventListener("change", syncCompactMode);

    return () => mediaQuery.removeEventListener("change", syncCompactMode);
  }, []);

  const selectedProduct = products.find((item) => item.id === selectedId) ?? products[0] ?? null;
  const filteredProducts =
    activeCategory === "ทั้งหมด" ? products : products.filter((item) => item.category === activeCategory);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function updateSelectedProduct(patch: Partial<ProductItem>) {
    if (!selectedProduct) return;

    setProducts((current) => current.map((item) => (item.id === selectedProduct.id ? { ...item, ...patch } : item)));
  }

  function handleCategoryChange(category: ProductCategory) {
    setActiveCategory(category);
    setPage(1);
  }

  function handleCreateNewProduct() {
    const next = makeNewProduct();
    setProducts((current) => [next, ...current]);
    setSelectedId(next.id);
    setActiveCategory("ทั้งหมด");
    setPage(1);
  }

  function handleDeleteSelected() {
    if (!selectedProduct) return;

    const remaining = products.filter((item) => item.id !== selectedProduct.id);
    setProducts(remaining);
    setSelectedId(remaining[0]?.id ?? "");
    setPage(1);
  }

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-[18px]">
      {!compactMode ? (
        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-[var(--shadow-card)] backdrop-blur-[14px]">
          <div className="flex items-start justify-between gap-4 max-[720px]:flex-col max-[720px]:items-stretch">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">หน้าจัดการสินค้า</p>
              <h2 className="my-[10px] text-[clamp(1.85rem,2.3vw,2.5rem)] leading-[0.98] tracking-[-0.06em]">จัดการสินค้า</h2>
              <p className="m-0 max-w-[60ch] leading-[1.65] text-[var(--foreground-soft)]">
                เพิ่ม ลบ แก้ไขราคา ประเภท และรูปภาพสินค้าในหน้าจอเดียว โดยแยกมุมมองให้กระชับและดูแลง่ายขึ้น
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch max-[720px]:[&>*]:w-full">
              <StatusPill tone="success">พร้อมใช้งานแล้ว</StatusPill>
              <button type="button" className={primaryButtonClass} onClick={handleCreateNewProduct}>
                เพิ่มสินค้าใหม่
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid min-h-0 items-start gap-[18px] [grid-template-columns:minmax(0,1fr)_minmax(0,1.1fr)] max-[1180px]:grid-cols-1">
        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-5 py-[18px] shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1180px]:px-4 max-[1180px]:py-4">
          <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">รายละเอียดสินค้า</p>
              <h2 className="my-[8px] text-[clamp(1.45rem,2.2vw,2.6rem)] leading-[0.98] tracking-[-0.06em]">แก้ไขสินค้า</h2>
            </div>
            <StatusPill>โหมดแก้ไข</StatusPill>
          </div>

          {selectedProduct ? (
            <div className="min-h-0 overflow-auto pr-1">
              <div className={`mt-[10px] min-h-[132px] overflow-hidden rounded-[18px] max-[1180px]:min-h-[108px] ${accentStyles[selectedProduct.accent].banner}`}>
                <div className="flex h-full items-end bg-[radial-gradient(circle_at_16%_24%,rgba(60,90,50,0.2),transparent_18%),radial-gradient(circle_at_82%_22%,rgba(50,80,55,0.14),transparent_16%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.22))] p-4 max-[1180px]:p-3">
                  <div className="flex items-center gap-[14px] rounded-[18px] bg-[rgba(22,27,38,0.82)] px-3 py-2.5 shadow-[rgba(0,0,0,0.2)_0_12px_24px] max-[1180px]:gap-[10px] max-[1180px]:rounded-[14px] max-[1180px]:px-[10px] max-[1180px]:py-2">
                    <div
                      className={`inline-flex h-[88px] w-[88px] items-center justify-center rounded-[18px] text-[1.55rem] font-extrabold tracking-[-0.04em] text-[#c49870] max-[1180px]:h-[72px] max-[1180px]:w-[72px] max-[1180px]:text-[1.25rem] ${accentStyles[selectedProduct.accent].thumb}`}
                    >
                      {selectedProduct.illustration}
                    </div>
                    <div>
                      <strong className="block text-[1.08rem] tracking-[-0.03em] text-white">{selectedProduct.name}</strong>
                      <p className="mt-1 text-[0.92rem] text-[rgba(255,255,255,0.72)]">{selectedProduct.category}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-[10px]">
                <Field label="ชื่อสินค้า">
                  <input
                    className={inputClass}
                    value={selectedProduct.name}
                    onChange={(event) => updateSelectedProduct({ name: event.target.value })}
                  />
                </Field>

                <Field label="ประเภทสินค้า">
                  <select
                    className={inputClass}
                    value={selectedProduct.category}
                    onChange={(event) => updateSelectedProduct({ category: event.target.value as ProductItem["category"] })}
                  >
                    <option value="อาหาร">อาหาร</option>
                    <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                    <option value="เบเกอรี">เบเกอรี</option>
                  </select>
                </Field>

                <div className="grid items-start gap-[10px] md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-2">
                    <Field label="ราคา">
                      <input
                        className={inputClass}
                        type="number"
                        value={selectedProduct.price}
                        onChange={(event) => updateSelectedProduct({ price: Number(event.target.value || 0) })}
                      />
                    </Field>

                    <button
                      type="button"
                      className={`${primaryButtonClass} min-h-[38px] w-full px-3 text-[0.95rem] shadow-none max-[1180px]:text-[0.86rem]`}
                    >
                      บันทึกการเปลี่ยนแปลง
                    </button>
                  </div>

                  <div className="grid content-start gap-2 rounded-[14px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(20,25,36,0.94),rgba(16,20,30,0.96))] p-3">
                    <span className="text-[0.92rem] font-semibold text-[#6b7a94]">รูปภาพสินค้า</span>
                    <p className="m-0 text-[0.88rem] leading-[1.5] text-[var(--foreground-soft)]">
                      {compactMode ? "JPG, PNG, WEBP ไม่เกิน 5 MB" : "รูปแบบไฟล์ที่รองรับ JPG, PNG, WEBP และขนาดไม่เกิน 5 MB"}
                    </p>
                    <button type="button" className={secondaryButtonClass}>
                      เลือกรูปภาพใหม่
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-[10px] grid gap-[10px] sm:grid-cols-2 xl:grid-cols-2">
                <button type="button" className={ghostButtonClass}>
                  เคลียร์ฟอร์ม
                </button>
                <button type="button" className={secondaryButtonClass}>
                  ปิดขาย
                </button>
                <button type="button" className={ghostButtonClass}>
                  ย้อนกลับ
                </button>
                <button type="button" className={dangerButtonClass} onClick={handleDeleteSelected}>
                  ลบสินค้านี้
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid place-items-center rounded-[16px] border border-dashed border-[var(--border)] bg-[rgba(18,22,34,0.72)] p-6 text-center">
              <div className="grid gap-3">
                <strong className="text-[1.08rem] tracking-[-0.03em] text-white">ยังไม่มีสินค้าในรายการ</strong>
                <p className="m-0 text-[0.92rem] leading-[1.6] text-[var(--foreground-soft)]">
                  เริ่มต้นด้วยการเพิ่มสินค้าใหม่ แล้วระบบจะเปิดฟอร์มแก้ไขให้อัตโนมัติ
                </p>
                <button type="button" className={primaryButtonClass} onClick={handleCreateNewProduct}>
                  เพิ่มสินค้าใหม่
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-5 py-[18px] shadow-[var(--shadow-card)] backdrop-blur-[14px] max-[1180px]:px-4 max-[1180px]:py-4">
          <div className="flex items-start justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
            <div>
              <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">รายการสินค้าทั้งหมด</p>
              <h2 className="my-[8px] text-[clamp(1.45rem,2.2vw,2.6rem)] leading-[0.98] tracking-[-0.06em]">เลือกสินค้าเพื่อแก้ไขได้ทันที</h2>
            </div>
            <div className="flex flex-wrap justify-end gap-[10px] max-[720px]:justify-stretch">
              <StatusPill>
                หน้า {currentPage}/{totalPages}
              </StatusPill>
              <StatusPill>{filteredProducts.length} รายการ</StatusPill>
            </div>
          </div>

          <div className="min-h-0 overflow-auto pr-1">
            <div className="mt-3 flex flex-wrap gap-[10px]">
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
                    onClick={() => handleCategoryChange(category)}
                  >
                    {category}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid gap-3">
              {visibleProducts.map((item) => {
                const active = item.id === selectedId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      active
                        ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[14px] rounded-[18px] border border-[rgba(108,92,231,0.5)] bg-[rgba(108,92,231,0.1)] px-3 py-[10px] text-left shadow-[rgba(108,92,231,0.12)_0_8px_16px] transition hover:-translate-y-px"
                        : "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[14px] rounded-[18px] border border-[var(--border)] bg-[rgba(22,27,38,0.7)] px-3 py-[10px] text-left transition hover:-translate-y-px hover:shadow-[var(--shadow-soft)]"
                    }
                    onClick={() => setSelectedId(item.id)}
                  >
                    <div
                      className={`inline-flex h-[74px] w-[74px] items-center justify-center rounded-[18px] text-[1.2rem] font-extrabold tracking-[-0.04em] text-[#c49870] max-[1180px]:h-[62px] max-[1180px]:w-[62px] max-[1180px]:text-[1.05rem] ${accentStyles[item.accent].thumb}`}
                    >
                      {item.illustration}
                    </div>

                    <div className="min-w-0">
                      <strong className="block text-[1rem] tracking-[-0.03em] text-white">{item.name}</strong>
                      <div className="mt-[6px] flex flex-wrap items-center gap-[10px]">
                        <span className="text-[0.92rem] text-[var(--foreground-soft)]">{item.category}</span>
                        <StatusPill tone={item.status === "พร้อมขาย" ? "success" : "ghost"}>{item.status}</StatusPill>
                      </div>
                      <p className="mt-[6px] text-[0.88rem] text-[#6b7a94]">{item.code}</p>
                    </div>

                    <div className="whitespace-nowrap text-[1rem] font-normal text-[#a0b8d8]">{formatPrice(item.price)}</div>
                  </button>
                );
              })}

              {visibleProducts.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[var(--border)] bg-[rgba(18,22,34,0.72)] px-4 py-5 text-[0.92rem] text-[var(--foreground-soft)]">
                  ยังไม่มีสินค้าในหมวดนี้
                </div>
              ) : null}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
              <button
                type="button"
                className={ghostButtonClass}
                disabled={currentPage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ก่อนหน้า
              </button>
              <span className="text-[0.92rem] text-[var(--foreground-soft)]">แสดงสูงสุด {itemsPerPage} สินค้าต่อหน้า</span>
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={currentPage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                ถัดไป
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
