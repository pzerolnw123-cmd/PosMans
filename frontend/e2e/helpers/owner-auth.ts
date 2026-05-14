import { expect, type Page } from "@playwright/test";

export const ownerCredentials = {
  username: process.env.E2E_OWNER_USERNAME,
  password: process.env.E2E_OWNER_PASSWORD,
  pin: process.env.E2E_OWNER_PIN,
};

export function hasOwnerCredentials() {
  return (
    process.env.E2E_RUN_OWNER_FLOWS === "1" &&
    Boolean(ownerCredentials.username && ownerCredentials.password && ownerCredentials.pin)
  );
}

export async function signInOwner(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const usernameInput = page.locator('input[autocomplete="username"]');
  const passwordInput = page.locator('input[autocomplete="current-password"]');
  const continueButton = page.getByRole("button", { name: "เข้าสู่ระบบ" });

  await expect(usernameInput).toBeEnabled();
  await usernameInput.fill(ownerCredentials.username || "");
  await expect(usernameInput).toHaveValue(ownerCredentials.username || "");

  await passwordInput.fill(ownerCredentials.password || "");
  await expect(passwordInput).toHaveValue(ownerCredentials.password || "");

  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(page.getByRole("heading", { name: /^(ตั้งค่า PIN ใหม่|ยืนยัน PIN)$/ })).toBeVisible();

  for (const digit of ownerCredentials.pin || "") {
    await page.getByRole("button", { name: digit }).click();
  }

  const unlockButton = page.getByRole("button", { name: /ปลดล็อกหลังบ้าน|บันทึก PIN และเข้าใช้งาน/ });
  await expect(unlockButton).toBeEnabled();
  await unlockButton.click();

  await Promise.race([
    expect(page).toHaveURL(/\/owner\/sales/),
    page.getByRole("region", { name: "sales layout" }).waitFor({ state: "visible" }),
    page.getByText("Invalid PIN").waitFor({ state: "visible" }).then(() => {
      throw new Error("E2E_OWNER_PIN does not match the stored PIN for E2E_OWNER_USERNAME.");
    }),
  ]);
}
