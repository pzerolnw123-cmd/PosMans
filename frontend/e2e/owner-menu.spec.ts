import { expect, test } from "@playwright/test";
import { hasOwnerCredentials, signInOwner } from "./helpers/owner-auth";

test.describe("owner menu flow", () => {
  test.skip(
    !hasOwnerCredentials(),
    "Set E2E_RUN_OWNER_FLOWS=1 with E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD, and E2E_OWNER_PIN to run the authenticated owner/menu flow.",
  );

  test("signs in and verifies product management basics", async ({ page }) => {
    await signInOwner(page);
    await page.goto("/owner/menu");

    await expect(page.getByRole("heading", { name: "แก้ไขสินค้า" })).toBeVisible();
    await expect(page.getByText("รายละเอียดสินค้า")).toBeVisible();
    await expect(page.getByText("รายการสินค้าทั้งหมด")).toBeVisible();

    const priceInput = page.getByLabel("ราคา");
    await priceInput.fill("");
    await expect(priceInput).toHaveValue("");

    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first().click();
    await expect(page.getByRole("button", { name: "บันทึกสินค้าใหม่" })).toBeVisible();
  });
});
