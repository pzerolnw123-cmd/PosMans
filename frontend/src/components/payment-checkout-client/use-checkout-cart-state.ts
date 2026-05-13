import { useEffect, useState } from "react";

import { readLatestSale, salesCartStorageKey, type CompletedSale, type StoredCartItem } from "./shared";

export function useCheckoutCartState(storeId: string) {
  const [items, setItems] = useState<StoredCartItem[]>([]);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function initCart() {
      const storageKey = salesCartStorageKey(storeId);
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) {
          setCompletedSale(readLatestSale(storeId));
          return;
        }

        const parsed = JSON.parse(raw) as { items?: StoredCartItem[] };
        const cartItems = Array.isArray(parsed.items) ? parsed.items : [];
        setItems(cartItems);
        if (cartItems.length > 0) {
          setCompletedSale(null);
        } else {
          setCompletedSale(readLatestSale(storeId));
        }
      } catch {
        setItems([]);
        sessionStorage.removeItem(storageKey);
        setCompletedSale(readLatestSale(storeId));
      } finally {
        setMounted(true);
      }
    }

    initCart();
  }, [storeId]);

  return {
    items,
    completedSale,
    setCompletedSale,
    mounted,
  };
}
