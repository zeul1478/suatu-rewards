import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { testCustomer } from "../support/data";
import { expect, signUp, staffLogIn, test } from "../e2e/support/fixtures";

/*
 * Every screen built so far: zero axe violations (WCAG 2.2 AA) and no sideways scrolling,
 * on every device project — including 320 px phones.
 */

async function checkScreen(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const problems = results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id} at ${node.target.join(" ")}: ${node.any[0]?.message ?? violation.help}`,
    ),
  );
  expect(problems).toEqual([]);
}

test.describe("accessibility and layout", () => {
  for (const path of [
    "/s/suatu/signup",
    "/s/suatu/login",
    "/s/suatu/forgot-password",
    "/s/suatu/reset-password?token=x&c=00000000-0000-4000-8000-000000000000",
    "/legal/privacy",
    "/legal/terms",
    "/legal/suatu/program-terms",
    "/staff/suatu/login",
  ]) {
    test(`public screen ${path}`, async ({ page }) => {
      await page.goto(path);
      await checkScreen(page);
    });
  }

  test("sign-up with every error showing", async ({ page }) => {
    await page.goto("/s/suatu/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your phone number.")).toBeVisible();
    await checkScreen(page);
  });

  test("legal sheet open", async ({ page }) => {
    await page.goto("/s/suatu/signup");
    await page.getByRole("button", { name: "Program Terms" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await checkScreen(page);
  });

  test("customer home and account", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await checkScreen(page);
    await page.goto("/s/suatu/account");
    await checkScreen(page);
  });

  test("staff counter screen", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    await checkScreen(page);
  });
});
