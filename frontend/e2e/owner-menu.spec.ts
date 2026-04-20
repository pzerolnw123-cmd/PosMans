import { expect, test } from "@playwright/test";

const ownerUsername = process.env.E2E_OWNER_USERNAME;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
const ownerPin = process.env.E2E_OWNER_PIN;

test.describe("owner menu flow", () => {
  test.skip(
    !ownerUsername || !ownerPassword || !ownerPin,
    "Set E2E_OWNER_USERNAME, E2E_OWNER_PASSWORD, and E2E_OWNER_PIN to run the authenticated owner/menu flow.",
  );

  test("signs in and verifies product management basics", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });

    const usernameInput = page.locator('input[autocomplete="username"]');
    const passwordInput = page.locator('input[autocomplete="current-password"]');
    const continueButton = page.getByRole("button", { name: "ดำเนินการต่อ" });

    await expect(usernameInput).toBeEnabled();
    await usernameInput.click();
    await usernameInput.pressSequentially(ownerUsername || "");
    await expect(usernameInput).toHaveValue(ownerUsername || "");
    await passwordInput.click();
    await passwordInput.pressSequentially(ownerPassword || "");
    await expect(passwordInput).toHaveValue(ownerPassword || "");
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(page.getByRole("heading", { name: /^(ตั้งค่า PIN ใหม่|ยืนยัน PIN)$/ })).toBeVisible();

    for (const digit of ownerPin || "") {
      await page.getByRole("button", { name: digit }).click();
    }

    const unlockButton = page.getByRole("button", { name: /ปลดล็อกหลังบ้าน|บันทึก PIN และเข้าใช้งาน/ });
    await expect(unlockButton).toBeEnabled();
    await unlockButton.click();

    await Promise.race([
      page.waitForURL(/\/owner\/sales/),
      page.getByText("Invalid PIN").waitFor({ state: "visible" }).then(() => {
        throw new Error("E2E_OWNER_PIN does not match the stored PIN for E2E_OWNER_USERNAME.");
      }),
    ]);
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
