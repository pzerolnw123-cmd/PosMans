import { expect, test } from "@playwright/test";
import path from "node:path";

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

  test("auth visuals show hero image and animated floating balls", async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto("/login", { waitUntil: "networkidle" });

    await expect(page.locator('input[autocomplete="username"]')).toBeVisible();
    await expect(page.locator(".auth-floating-ball").first()).toBeVisible();
    await expect(page.locator(".auth-hero-slide")).toHaveCount(4);

    await page.waitForTimeout(1300);
    const maxHeroOpacity = await page.locator(".auth-hero-slide").evaluateAll((nodes) =>
      Math.max(...nodes.map((node) => Number.parseFloat(getComputedStyle(node).opacity))),
    );
    expect(maxHeroOpacity).toBeGreaterThan(0.5);

    const initialTransform = await page.locator(".auth-floating-ball").first().evaluate((node) => getComputedStyle(node).transform);
    await page.waitForTimeout(1200);
    const movedTransform = await page.locator(".auth-floating-ball").first().evaluate((node) => getComputedStyle(node).transform);
    expect(movedTransform).not.toBe(initialTransform);

    await page.screenshot({
      path: path.join(__dirname, "..", "test-results", "auth-login-visual.png"),
      fullPage: false,
    });
  });
});
