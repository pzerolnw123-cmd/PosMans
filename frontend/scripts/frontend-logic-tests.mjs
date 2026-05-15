import assert from "node:assert/strict";

const { isRecoverableDevNetworkError } = await import("../src/lib/dev-network-recovery.ts");
const { buildClientErrorReport } = await import("../src/lib/client-error-reporting.ts");
const {
  customerDisplayPollDelay,
  shouldRefreshCustomerDisplayStoreSnapshot,
} = await import("../src/components/customer-display/polling.ts");
const { enforceMaxEntries, pruneExpiredEntries, sumByteLengths } = await import("../src/lib/cache-limits.ts");
const { formatBaht, formatCompactBaht, formatThaiNumber } = await import("../src/lib/format.ts");
const {
  crc16Ccitt,
  createPromptPayPayload,
  normalizePromptPayProxy,
} = await import("../src/components/payment-checkout-client/promptpay.ts");
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
assert.equal(formatThaiNumber(1234567), "1,234,567");
assert.equal(formatBaht(1234.56), "฿1,235");
assert.equal(formatCompactBaht(950), "฿950");
assert.equal(formatCompactBaht(12_300), "฿12K");
assert.equal(formatCompactBaht(1_250_000), "฿1.3M");
assert.equal(crc16Ccitt("123456789"), "29B1");
assert.deepEqual(
  normalizePromptPayProxy({
    promptPayRecipientType: "MOBILE",
    promptPayMobileId: "081-234-5678",
    promptPayNationalId: "",
    promptPayTaxId: "",
  }),
  { tag: "01", value: "0066812345678" },
);
assert.deepEqual(
  normalizePromptPayProxy({
    promptPayRecipientType: "NATIONAL_ID",
    promptPayMobileId: "",
    promptPayNationalId: "1-2345-67890-12-3",
    promptPayTaxId: "",
  }),
  { tag: "02", value: "1234567890123" },
);
assert.equal(
  normalizePromptPayProxy({
    promptPayRecipientType: "STATIC_QR",
    promptPayMobileId: "0812345678",
    promptPayNationalId: "",
    promptPayTaxId: "",
  }),
  null,
);
const promptPayPayload = createPromptPayPayload(
  {
    promptPayRecipientType: "MOBILE",
    promptPayMobileId: "0812345678",
    promptPayNationalId: "",
    promptPayTaxId: "",
  },
  125.5,
);
assert.equal(promptPayPayload, "00020101021229370016A0000006770101110113006681234567853037645406125.505802TH630434FE");
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
assert.equal(customerDisplayPollDelay("offline"), 5000);
assert.equal(customerDisplayPollDelay("connecting"), 2000);
assert.equal(customerDisplayPollDelay("offline", 1), 10000);
assert.equal(customerDisplayPollDelay("offline", 10), 60000);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 31000, lastStoreSnapshotAt: 1000, connectionState: "live" }), true);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 30999, lastStoreSnapshotAt: 1000, connectionState: "live" }), false);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 6000, lastStoreSnapshotAt: 1000, connectionState: "offline" }), true);
assert.equal(shouldRefreshCustomerDisplayStoreSnapshot({ now: 6000, lastStoreSnapshotAt: 1000, connectionState: "offline", consecutiveFailures: 1 }), false);
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
