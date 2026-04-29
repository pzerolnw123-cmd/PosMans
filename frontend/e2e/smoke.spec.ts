import { expect, test } from "@playwright/test";

test.describe("frontend smoke", () => {
  test("renders login without an authenticated session", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /ดำเนินการต่อ|Continue/i })).toBeVisible();
  });

  test("redirects protected owner routes without a session cookie", async ({ page }) => {
    await page.goto("/owner");

    await expect(page).toHaveURL(/\/login$/);
  });

  test("keeps API proxy auth and csrf boundaries active", async ({ request }) => {
    const meResponse = await request.get("/api/auth/me");
    expect(meResponse.status()).toBe(401);

    const uploadResponse = await request.post("/api/uploads/sign", {
      data: {
        fileName: "smoke.png",
        contentType: "image/png",
        contentLength: 128,
        purpose: "PRODUCT_IMAGE",
      },
    });
    expect(uploadResponse.status()).toBe(403);
  });
});
