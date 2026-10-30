import type { Page } from "@playwright/test";
import { testCustomer } from "../support/data";
import { randomInt } from "node:crypto";
import { closeDb, createTempStaff, db, testStoreId } from "../support/db";
import { at, expect, signUp, STORE, staffLogIn, test } from "../e2e/support/fixtures";

/*
 * The main screens as saved screenshots. Anything that changes per run (times, codes, the
 * countdown, random phone digits) is masked. Customers use the same fictional name every time.
 */

test.afterAll(closeDb);

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // A cancelled animation (the loading placeholder's pulse) counts as finished.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))),
  );
}

async function customerWithPoints(page: Page, visits: number) {
  const customer = { ...testCustomer(), firstName: "Ana", lastName: "Exemplu" };
  await signUp(page, customer);
  const storeId = await testStoreId();
  for (let i = 0; i < visits; i++) {
    await db().query(`select public.earn_points($1, $2, null, gen_random_uuid()::text)`, [
      storeId,
      customer.phone.e164,
    ]);
  }
  await page.reload();
  return customer;
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("sign up", async ({ page }) => {
      await page.goto(`/s/${STORE}/signup`);
      await settle(page);
      await expect(page).toHaveScreenshot(`signup-${colorScheme}.png`, { fullPage: true });
    });

    test("log in", async ({ page }) => {
      await page.goto(`/s/${STORE}/login`);
      await settle(page);
      await expect(page).toHaveScreenshot(`login-${colorScheme}.png`, { fullPage: true });
    });

    test("home with 35 points", async ({ page }) => {
      await customerWithPoints(page, 7);
      await expect(page.getByTestId("points-balance")).toHaveText("35");
      await settle(page);
      await expect(page).toHaveScreenshot(`home-35-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.getByTestId("last-visit")],
      });
    });

    test("rewards, history and account", async ({ page }) => {
      const customer = await customerWithPoints(page, 7);
      await page.goto(`/s/${STORE}/rewards`);
      await settle(page);
      await expect(page).toHaveScreenshot(`rewards-${colorScheme}.png`, { fullPage: true });

      await page.goto(`/s/${STORE}/history`);
      await settle(page);
      await expect(page).toHaveScreenshot(`history-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.getByText(/\d{4}, \d{1,2}:\d{2}\s?[AP]M/)],
      });

      await page.goto(`/s/${STORE}/account`);
      await settle(page);
      await expect(page).toHaveScreenshot(`account-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.getByText(customer.phone.e164), page.getByLabel("Email", { exact: true })],
      });
    });

    test("home with a coffee unlocked, and the code screen", async ({ page }) => {
      await customerWithPoints(page, 20);
      await expect(page.getByText("Free coffee unlocked")).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`home-unlocked-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.getByTestId("last-visit")],
      });

      await page.getByRole("button", { name: "Redeem" }).click();
      await expect(page).toHaveURL(at(`/s/${STORE}/redeem`));
      await settle(page);
      await expect(page).toHaveScreenshot(`code-${colorScheme}.png`, {
        fullPage: true,
        mask: [page.getByRole("img", { name: /^Code / }), page.getByText(/^\d:\d\d$/)],
      });
    });
  });
}

test("counter: login and a visit added", async ({ page }) => {
  await page.goto(`/staff/${STORE}/login`);
  await settle(page);
  await expect(page).toHaveScreenshot("staff-login.png", { fullPage: true });

  const customer = await customerWithPoints(await page.context().newPage(), 0);
  // A fresh cashier, so "Recent entries" holds exactly this one visit on every run.
  const code = `V${randomInt(100_000, 999_999)}`;
  await createTempStaff(code, "counter password 8");
  await staffLogIn(page, code, "counter password 8");
  await page.getByLabel("Customer phone number").fill(customer.phone.typed);
  await page.getByRole("button", { name: "Add visit (+5)" }).click();
  await expect(page.getByTestId("visit-banner")).toContainText("Ana E. · 5 / 100");
  await settle(page);
  await expect(page).toHaveScreenshot("staff-visit-added.png", {
    fullPage: true,
    mask: [page.getByText(/^\d{1,2}:\d{2}\s?[AP]M$/)],
  });
});
