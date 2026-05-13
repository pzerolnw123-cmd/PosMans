import { expect, test } from "@playwright/test";

const visualViewports = [
  { name: "Desktop HD+ 1600x900", width: 1600, height: 900 },
  { name: "Laptop 1440x900", width: 1440, height: 900 },
  { name: "Mobile portrait", width: 390, height: 844 },
];

test.describe("visual smoke", () => {
  for (const viewport of visualViewports) {
    test(`login screen renders without horizontal overflow at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/login", { waitUntil: "networkidle" });

      await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
      await expect(page.locator('input[autocomplete="current-password"]')).toBeVisible();

      const metrics = await page.evaluate(() => ({
        bodyWidth: document.body.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }));
      expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    });
  }
});
