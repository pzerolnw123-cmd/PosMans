"use client";

import { useMemo, useState } from "react";

const productPages = [
  [
    ["ข้าวกะเพราหมู", "เมนูหลัก", "฿65"],
    ["ข้าวผัดอเมริกัน", "ขายดี", "฿89"],
    ["ผัดไทยกุ้งสด", "ครัวร้อน", "฿79"],
    ["ชาไทยเย็น", "เครื่องดื่ม", "฿45"],
    ["ต้มยำรวมมิตร", "เมนูแนะนำ", "฿120"],
    ["ข้าวหมูทอด", "พร้อมขาย", "฿69"],
  ],
  [
    ["ข้าวไข่เจียวหมูสับ", "เมนูหลัก", "฿59"],
    ["สปาเกตตีผัดพริกแห้ง", "ขายดี", "฿99"],
    ["ยำวุ้นเส้นทะเล", "เมนูแนะนำ", "฿109"],
    ["ชามะนาว", "เครื่องดื่ม", "฿39"],
    ["ข้าวมันไก่ทอด", "เมนูหลัก", "฿75"],
    ["เฟรนช์ฟรายส์", "ของทานเล่น", "฿55"],
  ],
  [
    ["ข้าวคลุกกะปิ", "เมนูหลัก", "฿85"],
    ["ข้าวหน้าเนื้อ", "เมนูพิเศษ", "฿139"],
    ["เกี๊ยวซ่าหมู", "ของทานเล่น", "฿69"],
    ["อเมริกาโน่เย็น", "เครื่องดื่ม", "฿50"],
    ["ราเมงต้มยำ", "เมนูร้อน", "฿145"],
    ["ไก่ทอดซอสเกาหลี", "ขายดี", "฿129"],
  ],
] as const;

export function SalesPaginationMockup() {
  const [pageIndex, setPageIndex] = useState(0);

  const products = useMemo(() => productPages[pageIndex], [pageIndex]);

  return (
    <>
      <div className="grid min-h-0 grid-cols-3 gap-4 max-[720px]:grid-cols-2" aria-label="products">
        {products.map(([name, group, price]) => (
          <article
            key={`${pageIndex}-${name}`}
            className="grid min-h-[172px] content-start gap-3 rounded-[18px] border border-[rgba(100,120,160,0.18)] bg-[linear-gradient(180deg,rgba(26,32,48,0.92),rgba(22,27,38,0.92))] p-[14px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-[120px] w-[140px] rounded-xl border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
              <b className="text-base leading-[1.2] text-white">{price}</b>
            </div>
            <div className="grid gap-1.5">
              <strong className="text-base leading-[1.2] text-white">{name}</strong>
              <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{group}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-t-[rgba(100,120,160,0.12)] pt-3 max-[720px]:flex-col max-[720px]:items-stretch">
        <button
          type="button"
          className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[rgba(22,27,38,0.8)] px-4 font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[rgba(0,0,0,0.15)_0_5px_10px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none max-[720px]:w-full"
          disabled={pageIndex === 0}
          onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
        >
          ย้อนกลับ
        </button>

        <div className="grid justify-items-center gap-1 text-center">
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Menu Pagination</p>
          <strong className="text-[1rem] tracking-[-0.03em] text-white">หน้ารายการ {pageIndex + 1}</strong>
          <span className="text-[0.92rem] text-[var(--foreground-soft)]">
            แสดง {products.length} เมนูในหน้านี้
          </span>
        </div>

        <button
          type="button"
          className="inline-flex h-[52px] w-[152px] items-center justify-center rounded-2xl border border-transparent bg-[linear-gradient(135deg,var(--brand)_0%,#8070f0_100%)] px-4 font-bold text-white shadow-[rgba(108,92,231,0.18)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 max-[720px]:w-full"
          disabled={pageIndex === productPages.length - 1}
          onClick={() => setPageIndex((current) => Math.min(productPages.length - 1, current + 1))}
        >
          ถัดไป
        </button>
      </div>
    </>
  );
}
