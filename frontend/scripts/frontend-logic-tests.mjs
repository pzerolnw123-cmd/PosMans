import assert from "node:assert/strict";

const { isRecoverableDevNetworkError } = await import("../src/lib/dev-network-recovery.ts");
const { buildClientErrorReport } = await import("../src/lib/client-error-reporting.ts");
const {
  customerDisplayPollDelay,
  shouldRefreshCustomerDisplayStoreSnapshot,
} = await import("../src/components/customer-display/polling.ts");
const { enforceMaxEntries, pruneExpiredEntries, sumByteLengths } = await import("../src/lib/cache-limits.ts");
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
assert.equal(isRecoverableDevNetworkError({ message: "Network Error" }, "development"), false);
assert.deepEqual(buildClientErrorReport("app-error-boundary", Object.assign(new Error("boom"), { digest: "digest-1" })), {
  source: "app-error-boundary",
  message: "boom",
  digest: "digest-1",
});
assert.equal(customerDisplayPollDelay("live"), 30000);
assert.equal(customerDisplayPollDelay("offline"), 1500);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 31000, lastStoreSnapshotAt: 1000, connectionState: "live" }), true);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 30999, lastStoreSnapshotAt: 1000, connectionState: "live" }), false);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 2500, lastStoreSnapshotAt: 1000, connectionState: "offline" }), true);
const cachePolicyMap = new Map([
  ["expired", { expiresAt: 1000, bytes: new Uint8Array([1, 2]) }],
  ["fresh-1", { expiresAt: 3000, bytes: new Uint8Array([3]) }],
  ["fresh-2", { expiresAt: 4000, bytes: new Uint8Array([4, 5, 6]) }],
]);
pruneExpiredEntries(cachePolicyMap, 2000);
assert.deepEqual([...cachePolicyMap.keys()], ["fresh-1", "fresh-2"]);
assert.equal(sumByteLengths(cachePolicyMap.values(), (entry) => entry.bytes.byteLength), 4);
cachePolicyMap.set("fresh-3", { expiresAt: 5000, bytes: new Uint8Array([7]) });
enforceMaxEntries(cachePolicyMap, 2);
assert.deepEqual([...cachePolicyMap.keys()], ["fresh-2", "fresh-3"]);

const normalizedProduct = normalizeCartProduct(product);
assert.notEqual(normalizedProduct, product);
assert.deepEqual(
  normalizedProduct,
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
assert.deepEqual(reconcileCartItemsWithProducts([{ product, quantity: 0 }], [{ ...product, stockQuantity: 3 }]), [
  {
    product: {
      ...product,
      status: "พร้อมขาย",
      costPerUnit: 12,
      stockQuantity: 3,
      lowStockThreshold: 2,
    },
    quantity: 1,
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
