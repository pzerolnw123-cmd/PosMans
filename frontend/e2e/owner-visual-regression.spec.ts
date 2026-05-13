import { expect, test } from "@playwright/test";
import { hasOwnerCredentials, signInOwner } from "./helpers/owner-auth";

const ownerVisualRoutes = [
  { path: "/owner/menu", heading: "แก้ไขสินค้า" },
  { path: "/owner/sales", heading: "ขายหน้าร้าน" },
  { path: "/owner/payments", heading: "ชำระเงิน" },
];

test.describe("owner visual regression contracts", () => {
  test.skip(
    !hasOwnerCredentials(),
    "Set E2E_RUN_OWNER_FLOWS=1 with E2E owner credentials to run authenticated owner visual checks.",
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await signInOwner(page);
  });

  for (const route of ownerVisualRoutes) {
    test(`${route.path} stays inside the Desktop HD+ viewport`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();

      const metrics = await page.evaluate(() => {
        const main = document.querySelector("main") || document.body;
        const rect = main.getBoundingClientRect();
        return {
          bodyWidth: document.body.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          mainTop: rect.top,
          mainWidth: rect.width,
        };
      });

      expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(metrics.mainTop).toBeGreaterThanOrEqual(-1);
      expect(metrics.mainWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    });
  }
});
