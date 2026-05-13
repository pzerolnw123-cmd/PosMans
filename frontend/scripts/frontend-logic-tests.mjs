import assert from "node:assert/strict";

const { isRecoverableDevNetworkError } = await import("../src/lib/dev-network-recovery.ts");
const {
  normalizeCartProduct,
  reconcileCartItemsWithLiveProducts,
  reconcileCartItemsWithProducts,
} = await import("../src/components/sales-workspace/cart-reconcile.ts");

const product = {
  id: "product-1",
  code: "FOOD-001",
  name: "ข้าวกะเพรา",
  category: "อาหาร",
  price: 50,
  costPerUnit: 12.9,
  status: "",
  trackStock: true,
  stockQuantity: 4.9,
  lowStockThreshold: 2.4,
  imageUrl: null,
  uploadedKey: null,
};

assert.equal(isRecoverableDevNetworkError(new Error("Network Error"), "development"), true);
assert.equal(isRecoverableDevNetworkError("failed to fetch RSC payload", "development"), true);
assert.equal(isRecoverableDevNetworkError(new Error("Network Error"), "production"), false);
assert.equal(isRecoverableDevNetworkError("unrelated error", "development"), false);

assert.deepEqual(
  normalizeCartProduct(product),
  {
    ...product,
    status: "พร้อมขาย",
    costPerUnit: 12,
    stockQuantity: 4,
    lowStockThreshold: 2,
  },
);

const cartItems = [{ product, quantity: 2.8 }];
assert.deepEqual(reconcileCartItemsWithProducts(cartItems, [{ ...product, name: "สดกว่า", stockQuantity: 3 }]), [
  {
    product: {
      ...product,
      name: "สดกว่า",
      status: "พร้อมขาย",
      costPerUnit: 12,
      stockQuantity: 3,
      lowStockThreshold: 2,
    },
    quantity: 2,
  },
]);
assert.deepEqual(reconcileCartItemsWithProducts(cartItems, []), []);
assert.equal(
  await reconcileCartItemsWithLiveProducts(cartItems, async () => {
    throw new Error("offline");
  }),
  cartItems,
);

console.log("Frontend logic tests passed.");
