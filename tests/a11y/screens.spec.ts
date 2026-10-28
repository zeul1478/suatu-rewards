import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { testCustomer, testPhone } from "../support/data";
import { closeDb, db } from "../support/db";
import { expect, signUp, staffLogIn, test } from "../e2e/support/fixtures";

/*
 * Every screen built so far: zero axe violations (WCAG 2.2 AA) and no sideways scrolling,
 * on every device project — including 320 px phones.
 */

async function checkScreen(page: Page) {
  // Measure the settled screen, not a fade-in halfway through.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished)),
  );
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

test.afterAll(closeDb);

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

  // The customer app follows the phone's appearance; the runs above use light mode.
  for (const path of ["/s/suatu/signup", "/s/suatu/login", "/legal/privacy"]) {
    test(`dark mode ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      await checkScreen(page);
    });
  }

  test("customer home in dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await signUp(page, testCustomer());
    await checkScreen(page);
  });

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

  test("staff counter screen, empty and with a visit banner", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    await checkScreen(page);

    await page.getByLabel("Customer phone number").fill(testPhone().typed);
    await page.getByRole("button", { name: "Add visit (+5)" }).click();
    await expect(page.getByTestId("visit-banner")).toBeVisible();
    await checkScreen(page);
  });

  test("customer home with a reward unlocked, and the code screen", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    const {
      rows: [store],
    } = await db().query(`select id from public.stores where slug = 'suatu'`);
    for (let i = 0; i < 20; i++) {
      await db().query(`select public.earn_points($1, $2, null, gen_random_uuid()::text)`, [
        store.id,
        customer.phone.e164,
      ]);
    }
    await page.reload();
    await expect(page.getByText("Free coffee unlocked")).toBeVisible();
    await checkScreen(page);

    await page.getByRole("button", { name: "Redeem" }).click();
    await expect(page.getByRole("heading", { name: "Your code" })).toBeVisible();
    await checkScreen(page);
  });
});
