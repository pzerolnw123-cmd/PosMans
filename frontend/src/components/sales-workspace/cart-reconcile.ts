import type { ProductItem } from "@/components/product-management-studio/types";

export type SalesCartItem = {
  product: ProductItem;
  quantity: number;
};

function normalizeStockValue(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value || 0)) : 0;
}

export function normalizeCartProduct(product: ProductItem): ProductItem {
  return {
    ...product,
    status: product.status || "พร้อมขาย",
    costPerUnit: normalizeStockValue(product.costPerUnit),
    trackStock: product.trackStock ?? false,
    stockQuantity: normalizeStockValue(product.stockQuantity),
    lowStockThreshold: normalizeStockValue(product.lowStockThreshold),
  };
}

export function reconcileCartItemsWithProducts(cartItems: SalesCartItem[], liveProducts: ProductItem[]) {
  const liveProductsById = new Map(liveProducts.map((product) => [product.id, product] as const));

  return cartItems
    .map((item) => {
      const liveProduct = liveProductsById.get(item.product.id);
      if (!liveProduct) {
        return null;
      }

      return {
        product: normalizeCartProduct(liveProduct),
        quantity: Math.max(1, Math.floor(item.quantity)),
      };
    })
    .filter((item): item is SalesCartItem => Boolean(item));
}

export async function reconcileCartItemsWithLiveProducts(
  cartItems: SalesCartItem[],
  loadProducts: () => Promise<ProductItem[]>,
) {
  try {
    return reconcileCartItemsWithProducts(cartItems, await loadProducts());
  } catch {
    return cartItems;
  }
}
