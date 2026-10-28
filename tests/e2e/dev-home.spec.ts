import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("dev home", () => {
  test("loads with demo logins and the screen list", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dev home");
    await expect(page.getByRole("img", { name: "User name: 0000" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Password: 0000" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Screens" })).toBeVisible();
  });

  test("has no horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("passes axe accessibility checks (WCAG 2.2 AA)", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
