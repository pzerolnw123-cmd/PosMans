"use client";

import type { PointerEvent, RefObject } from "react";
import type { ProductItem } from "@/components/product-management-studio/types";
import { StatusPill } from "@/components/ui-primitives";
import { BasketIcon, formatBaht, stockLimit } from "@/components/sales-workspace/helpers";

type CartItem = { product: ProductItem; quantity: number };

type SalesCartPanelProps = {
  cartPulse: boolean;
  itemCount: number;
  cartItems: CartItem[];
  cartScrollMetric: { top: number; height: number; visible: boolean };
  cartScrollRef: RefObject<HTMLDivElement | null>;
  updateCartScrollbar: () => void;
  handleCartPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  handleCartPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  stopCartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  highlightedCartProductId: string;
  removeItem: (productId: string) => void;
  changeQuantity: (productId: string, direction: 1 | -1) => void;
  handleAddToCart: (product: ProductItem) => void;
  subtotal: number;
  clearCart: () => void;
  handleGoToPayment: () => void;
};

export function SalesCartPanel({ cartPulse, itemCount, cartItems, cartScrollMetric, cartScrollRef, updateCartScrollbar, handleCartPointerDown, handleCartPointerMove, stopCartDrag, highlightedCartProductId, removeItem, changeQuantity, handleAddToCart, subtotal, clearCart, handleGoToPayment }: SalesCartPanelProps) {
  return (
      <aside
        className={
          cartPulse
            ? "grid min-h-0 animate-[cart-panel-pulse_560ms_ease-out] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[18px] rounded-none border border-[var(--cart-panel-border)] bg-[var(--panel-strong)] p-[18px] shadow-[var(--cart-shadow-strong)_0_8px_24px] max-[720px]:p-4"
            : "grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-[18px] rounded-none border border-[var(--border)] bg-[var(--panel-strong)] p-[18px] shadow-[var(--shadow-soft)] transition-all duration-500 max-[720px]:p-4"
        }
        aria-label="cart layout"
      >
        <div className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
          <div>
            <p className="m-0 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-[var(--eyebrow)]">Current Bill</p>
            <strong className="my-[10px] block text-[1.4rem] leading-none tracking-[-0.04em] text-[var(--foreground)]">{itemCount > 0 ? "ตะกร้าปัจจุบัน" : "ยังไม่มีบิล"}</strong>
          </div>
          <StatusPill>{itemCount} รายการ</StatusPill>
        </div>

        {cartItems.length > 0 ? (
          <div className="relative min-h-0 max-[1366px]:max-h-[56vh] max-[720px]:max-h-[46vh]">
            <div
              ref={cartScrollRef}
              className={
                cartScrollMetric.visible
                   ? "sales-cart-scroll grid h-full min-h-0 touch-auto cursor-grab select-none content-start gap-3 overflow-y-auto overflow-x-hidden pb-2 pl-0 pr-4 pt-[1px] active:cursor-grabbing max-[1366px]:max-h-[56vh] max-[720px]:max-h-[46vh]"
                   : "sales-cart-scroll grid h-full min-h-0 touch-auto select-auto content-start gap-3 overflow-y-auto overflow-x-hidden pb-2 pl-0 pr-0 pt-[1px] max-[1366px]:max-h-[56vh] max-[720px]:max-h-[46vh]"
              }
              onScroll={updateCartScrollbar}
              onPointerDown={handleCartPointerDown}
              onPointerMove={handleCartPointerMove}
              onPointerUp={stopCartDrag}
              onPointerCancel={stopCartDrag}
              onPointerLeave={stopCartDrag}
            >
              {cartItems.map((item) => {
                const highlighted = highlightedCartProductId === item.product.id;

                return (
                  <div
                    key={item.product.id}
                    className={
                      highlighted
                        ? "grid animate-[cart-row-enter_340ms_cubic-bezier(.2,.8,.2,1)] grid-cols-[75px_minmax(0,1fr)] items-start gap-3 rounded-none border border-[var(--cart-row-border)] bg-[var(--surface)] p-[10px] shadow-[var(--cart-shadow-mid)_0_4px_10px]"
                        : "grid grid-cols-[75px_minmax(0,1fr)] items-start gap-3 rounded-none border border-[var(--border)] bg-[var(--surface)] p-[10px] transition-all duration-500"
                    }
                  >
                    {item.product.imageUrl ? (
                      <span
                        className="h-[83px] w-[75px] rounded-[10px] border border-[var(--border-subtle)] bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.product.imageUrl})` }}
                        role="img"
                        aria-label={item.product.name}
                      />
                    ) : (
                      <span className="grid h-[52px] w-[52px] place-items-center rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--foreground-soft)]">
                        <BasketIcon size={18} />
                      </span>
                    )}
                    <div className="grid min-w-0 gap-2 pt-0.5">
                      <div className="grid min-w-0 gap-1">
                        <strong className="truncate text-[0.95rem] leading-[1.25] text-[var(--foreground)]">{item.product.name}</strong>
                        <span className="text-[0.78rem] text-[var(--foreground-soft)]">
                          {formatBaht(item.product.price)} x {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="inline-flex h-8 items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-muted)]">
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center text-[1rem] font-bold text-[var(--foreground)] transition hover:bg-[var(--overlay-white-06)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-45 disabled:hover:bg-transparent"
                            disabled={item.quantity <= 1}
                            onClick={() => changeQuantity(item.product.id, -1)}
                            aria-label={`ลดจำนวน ${item.product.name}`}
                          >
                            -
                          </button>
                          <span className="grid h-8 min-w-8 place-items-center text-[0.85rem] font-bold text-[var(--foreground)]">{item.quantity}</span>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center text-[1rem] font-bold text-[var(--foreground)] transition hover:bg-[var(--overlay-white-06)] disabled:cursor-not-allowed disabled:text-[var(--foreground-soft)] disabled:opacity-45 disabled:hover:bg-transparent"
                            disabled={item.quantity >= stockLimit(item.product)}
                            onClick={() => handleAddToCart(item.product)}
                            aria-label={`เพิ่มจำนวน ${item.product.name}`}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="h-8 rounded-[10px] border border-[var(--danger-soft)] px-2.5 text-[0.78rem] font-bold text-[var(--danger)] transition hover:bg-[var(--danger-soft)]"
                          onClick={() => removeItem(item.product.id)}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {cartScrollMetric.visible ? (
              <span className="pointer-events-none absolute bottom-0 right-0 top-0 w-[7px] rounded-full bg-[var(--scroll-track)]">
                <span
                  className="absolute left-0 w-full rounded-full [background:var(--scroll-thumb)] shadow-[var(--brand-shadow)_0_0_14px]"
                  style={{ top: `${cartScrollMetric.top}%`, height: `${cartScrollMetric.height}%` }}
                />
              </span>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-0 place-items-center rounded-none border border-dashed border-[var(--border-soft)] bg-[var(--panel-subtle)] p-5 text-center">
            <div className="grid max-w-[220px] gap-2">
              <strong className="text-base leading-[1.35] text-[var(--foreground)]">เริ่มเพิ่มสินค้าเข้าตะกร้า</strong>
              <span className="text-[0.92rem] leading-[1.55] text-[var(--foreground-soft)]">กดปุ่มเพิ่มตะกร้าบนสินค้า รายการจะเด้งเข้ามาตรงนี้ทันที</span>
            </div>
          </div>
        )}

        <div className="grid gap-3 border-t border-t-[var(--border)] pt-2">
          {[
            ["ยอดรวม", formatBaht(subtotal)],
            ["สุทธิ", formatBaht(subtotal)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 max-[720px]:flex-col max-[720px]:items-stretch">
              <span className="m-0 text-[0.95rem] text-[var(--foreground-soft)]">{label}</span>
              <strong className="text-base leading-[1.2] text-[var(--foreground)]">{value}</strong>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 max-[720px]:grid-cols-1">
          <button
            type="button"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-[18px] font-bold text-[var(--foreground)] transition hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-hover)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            disabled={cartItems.length === 0}
            onClick={clearCart}
          >
            ล้างบิล
          </button>
          <button
            type="button"
            className="inline-flex h-[52px] items-center justify-center rounded-2xl border border-transparent [background:var(--brand-gradient)] px-[18px] font-bold text-[var(--button-text)] shadow-[var(--brand-shadow)_0_6px_14px] transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            disabled={cartItems.length === 0}
            onClick={handleGoToPayment}
          >
            ไปชำระเงิน
          </button>
        </div>
      </aside>
  );
}

