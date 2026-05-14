import { expect, test } from "@playwright/test";

test.describe("frontend smoke", () => {
  test("renders login without an authenticated session", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /เข้าสู่ระบบ|Sign in/i })).toBeVisible();
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

  test("does not open customer display events when the public token is rejected", async ({ page }) => {
    let stateRequests = 0;
    let eventRequests = 0;

    await page.route("**/api/customer-displays/display-forbidden/state?**", async (route) => {
      stateRequests += 1;
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "forbidden" }),
      });
    });
    await page.route("**/api/customer-displays/display-forbidden/store?**", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "forbidden" }),
      });
    });
    await page.route("**/api/customer-displays/display-forbidden/events?**", async (route) => {
      eventRequests += 1;
      await route.fulfill({
        status: 403,
        contentType: "text/plain",
        body: "forbidden",
      });
    });

    await page.goto("/display/display-forbidden?token=bad-token-value-that-is-long-enough");
    await expect(page.getByText("Customer Display")).toBeVisible();
    await page.waitForTimeout(2500);

    expect(stateRequests).toBeGreaterThanOrEqual(1);
    expect(eventRequests).toBe(0);
  });
});
