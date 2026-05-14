import { expect, test } from "@playwright/test";

const shouldRunRegistrationFlow = process.env.E2E_RUN_REGISTER_FLOW === "1";

test.describe("auth registration flow", () => {
  test.skip(
    !shouldRunRegistrationFlow,
    "Set E2E_RUN_REGISTER_FLOW=1 with a local backend/database to run the signup -> login -> PIN setup flow.",
  );

  test("signs up a new owner, logs in, and sets up PIN", async ({ page }) => {
    const uniqueSuffix = Date.now().toString(36);
    const username = `e2e.${uniqueSuffix}`;
    const password = "E2eRegisterPassword123!";
    const pin = "246810";

    await page.goto("/register", { waitUntil: "networkidle" });

    await page.getByLabel("ชื่อร้าน").fill(`E2E Register ${uniqueSuffix}`);
    await page.getByLabel("ชื่อเจ้าของ").fill("E2E Register Owner");
    await page.getByLabel("Username").fill(username);

    const registerPasswordInput = page.locator('input[autocomplete="new-password"]').first();
    const registerConfirmPasswordInput = page.locator('input[autocomplete="new-password"]').nth(1);

    await registerPasswordInput.fill(password);
    await page.getByRole("button", { name: "แสดงรหัสผ่าน", exact: true }).click();
    await expect(registerPasswordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "ซ่อนรหัสผ่าน", exact: true }).click();
    await expect(registerPasswordInput).toHaveAttribute("type", "password");

    await registerConfirmPasswordInput.fill(password);
    await expect(page.getByRole("button", { name: "สร้างบัญชีร้าน" })).toBeEnabled();
    await page.getByRole("button", { name: "สร้างบัญชีร้าน" }).click();
    await expect(page.getByRole("button", { name: "กำลังสร้างบัญชี..." })).toBeDisabled();

    await expect(page).toHaveURL(/\/login\?registered=1$/);
    await expect(page.getByText("สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบ")).toBeVisible();

    await page.locator('input[autocomplete="username"]').fill(username);
    const loginPasswordInput = page.locator('input[autocomplete="current-password"]');
    await loginPasswordInput.fill(password);
    await page.getByRole("button", { name: "แสดงรหัสผ่าน", exact: true }).click();
    await expect(loginPasswordInput).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "ซ่อนรหัสผ่าน", exact: true }).click();

    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByRole("heading", { name: "ตั้งค่า PIN ใหม่" })).toBeVisible();

    for (const digit of pin) {
      await page.getByRole("button", { name: digit }).click();
    }

    for (const digit of pin) {
      await page.getByRole("button", { name: digit }).click();
    }

    await expect(page.getByRole("button", { name: "บันทึก PIN และเข้าใช้งาน" })).toBeEnabled();
    await page.getByRole("button", { name: "บันทึก PIN และเข้าใช้งาน" }).click();

    await expect(page).toHaveURL(/\/owner\/sales$/);
  });
});
