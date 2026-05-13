import { useEffect, useState } from "react";

import { readLatestSale, salesCartStorageKey, type CompletedSale, type StoredCartItem } from "./shared";

export function useCheckoutCartState() {
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function initCart() {
      try {
        const raw = sessionStorage.getItem(salesCartStorageKey);
        if (!raw) {
          setCompletedSale(readLatestSale());
          return;
        }

        const parsed = JSON.parse(raw) as { items?: StoredCartItem[] };
        const cartItems = Array.isArray(parsed.items) ? parsed.items : [];
        setItems(cartItems);
        if (cartItems.length > 0) {
          setCompletedSale(null);
        } else {
          setCompletedSale(readLatestSale());
        }
      } catch {
        setItems([]);
        setCompletedSale(readLatestSale());
      } finally {
        setMounted(true);
      }
    }

    initCart();
  }, []);

  return {
    items,
    completedSale,
    setCompletedSale,
    mounted,
  };
}
