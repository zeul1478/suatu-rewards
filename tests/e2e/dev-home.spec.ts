import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("dev home", () => {
  test("explains the two parts: cashier (0000/0000) and customer (own details)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("a cashier and a customer");
    await expect(
      page.getByRole("heading", { name: "1. Open the app on your phones" }),
    ).toBeVisible();
    await expect(page.getByText(/one phone with two browser tabs/)).toBeVisible();

    await expect(page.getByRole("heading", { name: "Cashier", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "User name: 0000" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Password: 0000" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer", exact: true })).toBeVisible();
    await expect(page.getByText("Use your own details")).toBeVisible();

    await expect(page.getByRole("heading", { name: "3. Try the whole flow" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "All screens" })).toBeVisible();
  });

  test("each part's button opens its screen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Open the counter screen" }).click();
    await expect(page.getByRole("heading", { name: "Staff" })).toBeVisible();

    await page.goto("/");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { name: "Join Suatu Rewards" })).toBeVisible();
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
