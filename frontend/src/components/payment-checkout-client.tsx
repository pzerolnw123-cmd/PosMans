"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/components/product-management-studio/lib";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-primitives";

type PaymentMethod = "CASH" | "QR" | "CARD" | "TRANSFER" | "OTHER";

type StoredCartItem = {
  productId: string;
  quantity: number;
  product?: {
    id: string;
    code: string;
    name: string;
    category: string;
    price: number;
    imageUrl?: string | null;
  };
};

type SaleResponse = {
  sale: {
    id: string;
    code: string;
    total: number;
  };
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "เงินสด" },
  { value: "QR", label: "QR PromptPay" },
  { value: "CARD", label: "บัตร" },
  { value: "TRANSFER", label: "โอนเงิน" },
];

function formatBaht(value: number) {
  return `฿${value.toLocaleString("th-TH")}`;
}

export function PaymentCheckoutClient() {
  const router = useRouter();
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastSaleCode, setLastSaleCode] = useState("");
  const [billScrollMetric, setBillScrollMetric] = useState({ top: 0, height: 100, visible: false });
  const billScrollRef = useRef<HTMLDivElement | null>(null);
  const dragScrollRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0,
  });

  const subtotal = useMemo(() => items.reduce((total, item) => total + (item.product?.price || 0) * item.quantity, 0), [items]);
  const total = Math.max(0, subtotal - discount + tax);
  const itemCount = useMemo(() => items.reduce((totalItems, item) => totalItems + item.quantity, 0), [items]);

  useEffect(() => {
    const raw = sessionStorage.getItem("pos-mans-sales-cart");
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { items?: StoredCartItem[] };
      setItems(Array.isArray(parsed.items) ? parsed.items : []);
    } catch {
      setItems([]);
    }
  }, []);

  useLayoutEffect(() => {
    updateBillScrollbar();
  }, [items.length]);

  function updateBillScrollbar() {
    const node = billScrollRef.current;
    if (!node) {
      return;
    }

    const maxScroll = node.scrollHeight - node.clientHeight;
    if (maxScroll <= 0) {
      setBillScrollMetric({ top: 0, height: 100, visible: false });
      return;
    }

    const height = Math.max(14, (node.clientHeight / node.scrollHeight) * 100);
    const top = (node.scrollTop / maxScroll) * (100 - height);
    setBillScrollMetric({ top, height, visible: true });
  }

  function handleBillPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof HTMLElement && event.target.closest("button"))) {
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

  function handleBillPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragScrollRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.currentTarget.scrollTop = drag.scrollTop - (event.clientY - drag.startY);
    updateBillScrollbar();
  }

  function stopBillDrag(event: PointerEvent<HTMLDivElement>) {
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

  async function handleConfirmPayment() {
    if (items.length === 0 || busy) {
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await requestJson<SaleResponse>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod,
          discount,
          tax,
          note,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      sessionStorage.removeItem("pos-mans-sales-cart");
      setItems([]);
      setLastSaleCode(response.sale.code);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "ยืนยันการชำระไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px] gap-[18px] max-[1280px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
      <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Bill Summary</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">{items.length > 0 ? "รายการรอชำระ" : "ยังไม่มีรายการ"}</strong>
          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">ตรวจรายการก่อนยืนยันการชำระเงิน</p>
        </div>

        <div className="relative min-h-0">
          {items.length > 0 ? (
            <>
              <div
                ref={billScrollRef}
                className={
                  billScrollMetric.visible
                    ? "sales-cart-scroll grid h-full min-h-0 cursor-grab select-none content-start gap-3 overflow-y-auto overflow-x-hidden py-0 pl-0 pr-4 active:cursor-grabbing"
                    : "grid h-full min-h-0 select-none content-start gap-3 overflow-hidden py-0 pl-0 pr-0"
                }
                onScroll={updateBillScrollbar}
                onPointerDown={handleBillPointerDown}
                onPointerMove={handleBillPointerMove}
                onPointerUp={stopBillDrag}
                onPointerCancel={stopBillDrag}
                onPointerLeave={stopBillDrag}
              >
                {items.map((item) => (
                  <div key={item.productId} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-3">
                    {item.product?.imageUrl ? (
                      <span className="h-[52px] w-[52px] rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-cover bg-center" style={{ backgroundImage: `url(${item.product.imageUrl})` }} />
                    ) : (
                      <div className="h-[52px] w-[52px] rounded-[10px] border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.04)]" />
                    )}
                    <div className="grid min-w-0 gap-1">
                      <strong className="truncate text-base leading-[1.2] text-white">{item.product?.name || item.productId}</strong>
                      <span className="text-[0.92rem] text-[var(--foreground-soft)]">{formatBaht(item.product?.price || 0)} x {item.quantity}</span>
                    </div>
                    <strong className="text-base leading-[1.2] text-white">{formatBaht((item.product?.price || 0) * item.quantity)}</strong>
                  </div>
                ))}
              </div>
              {billScrollMetric.visible ? (
                <span className="pointer-events-none absolute bottom-0 right-0 top-0 w-[7px] bg-[rgba(15,19,29,0.78)]">
                  <span
                    className="absolute left-0 w-full rounded-full bg-[linear-gradient(180deg,rgba(240,106,223,0.98),rgba(169,108,255,0.94))] shadow-[rgba(240,106,223,0.24)_0_0_14px]"
                    style={{ top: `${billScrollMetric.top}%`, height: `${billScrollMetric.height}%` }}
                  />
                </span>
              ) : null}
            </>
          ) : (
            <div className="grid min-h-[220px] place-items-center rounded-none border border-dashed border-[rgba(100,120,160,0.2)] text-center text-[var(--foreground-soft)]">
              {lastSaleCode ? `บันทึกบิล ${lastSaleCode} เรียบร้อยแล้ว` : "กลับไปหน้าขายเพื่อเพิ่มสินค้าเข้าตะกร้า"}
            </div>
          )}
        </div>

        <div className="grid gap-3 border-t border-t-[var(--border)] pt-3">
          {[
            ["ยอดอาหาร", formatBaht(subtotal)],
            ["ส่วนลด", formatBaht(discount)],
            ["ภาษี", formatBaht(tax)],
            ["สุทธิ", formatBaht(total)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="text-base leading-[1.2] text-white">{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="grid min-h-0 grid-rows-[auto_auto_1fr_auto] gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)]">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Payment Methods</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">เลือกวิธีชำระ</strong>
          <p className="m-0 text-[0.95rem] leading-[1.65] text-[var(--foreground-soft)]">เลือกวิธีรับเงินก่อนบันทึกบิลจริง</p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          {paymentMethods.map((method) => (
            <button
              key={method.value}
              type="button"
              className={paymentMethod === method.value ? `${primaryButtonClass} min-h-[52px] rounded-2xl` : `${secondaryButtonClass} min-h-[52px] rounded-2xl`}
              onClick={() => setPaymentMethod(method.value)}
            >
              {method.label}
            </button>
          ))}
        </div>

        <div className="grid content-start gap-4">
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">ส่วนลด</span>
            <input className={inputClass} type="number" min={0} max={subtotal} value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">ภาษี</span>
            <input className={inputClass} type="number" min={0} value={tax} onChange={(event) => setTax(Math.max(0, Number(event.target.value) || 0))} />
          </label>
          <label className="grid gap-2">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">หมายเหตุบิล</span>
            <textarea className="min-h-[116px] rounded-[14px] border border-[rgba(100,120,160,0.22)] bg-[rgba(14,18,28,0.7)] px-[14px] py-3 text-[var(--foreground)] outline-none transition placeholder:text-[#556070] focus:border-[rgba(108,92,231,0.55)] focus:shadow-[inset_0_0_0_1px_var(--ring)]" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          {error ? <div className="rounded-none border border-[rgba(232,93,117,0.32)] bg-[rgba(232,93,117,0.08)] px-3 py-2 text-[0.86rem] font-bold text-[#ff8fa2]">{error}</div> : null}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <button type="button" className={`${secondaryButtonClass} min-h-[52px] rounded-2xl`} onClick={() => router.push("/owner/sales")}>
            กลับไปขาย
          </button>
          <button type="button" className={`${primaryButtonClass} min-h-[52px] rounded-2xl`} disabled={items.length === 0 || busy || discount > subtotal} onClick={handleConfirmPayment}>
            {busy ? "กำลังยืนยัน..." : "ยืนยันการชำระ"}
          </button>
        </div>
      </section>

      <section className="grid h-fit gap-[16px] rounded-none border border-[var(--border)] bg-[rgba(22,27,38,0.76)] px-5 py-[18px] shadow-[var(--shadow-soft)] max-[1280px]:col-span-2 max-[1180px]:col-span-1">
        <div>
          <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[#6b7a94]">Quick Panel</p>
          <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-white">สถานะชำระเงิน</strong>
        </div>
        <div className="grid gap-3">
          <div className="rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">จำนวนรายการ</span>
            <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">{items.length} รายการ / {itemCount} ชิ้น</strong>
          </div>
          <div className="rounded-none border border-[rgba(100,120,160,0.14)] bg-[rgba(255,255,255,0.03)] p-4">
            <span className="text-[0.92rem] text-[var(--foreground-soft)]">ยอดสุทธิ</span>
            <strong className="mt-2 block text-[1.2rem] leading-[1.1] text-white">{formatBaht(total)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
