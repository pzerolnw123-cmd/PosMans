import { expect, test } from "@playwright/test";
import { hasOwnerCredentials, signInOwner } from "./helpers/owner-auth";

test.describe("owner critical sales flow", () => {
  test.skip(
    !hasOwnerCredentials(),
    "Set E2E_RUN_OWNER_FLOWS=1 with E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD, and E2E_OWNER_PIN to run the authenticated owner/sales flow.",
  );

  test("moves an available product from sales to payment without submitting a sale", async ({ page }) => {
    await signInOwner(page);

    await page.goto("/owner/sales", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("region", { name: "sales layout" })).toBeVisible();

    const availableAddButtons = page.locator('button[aria-label="เพิ่มตะกร้า"]:not([disabled])');
    await expect(page.locator('body')).toContainText(/ขายหน้าร้าน|โหลดรายการสินค้าไม่สำเร็จ|ยังไม่มีสินค้า|เพิ่มตะกร้า/);

    if ((await availableAddButtons.count()) === 0) {
      test.skip(true, "No sellable products are available in the current E2E seed data.");
    }

    await availableAddButtons.first().click();
    await expect(page.getByText("ตะกร้าปัจจุบัน")).toBeVisible();
    await expect(page.getByRole("button", { name: "ไปชำระเงิน" })).toBeEnabled();

    await page.getByRole("button", { name: "ไปชำระเงิน" }).click();
    await expect(page).toHaveURL(/\/owner\/payments$/);
    await expect(page.getByRole("region", { name: "payment layout" })).toBeVisible();
    await expect(page.getByText("รายการรอชำระ")).toBeVisible();
    await expect(page.getByRole("button", { name: "ยืนยันการชำระ" })).toBeDisabled();
  });
});
