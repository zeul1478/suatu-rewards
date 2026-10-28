import type { Page } from "@playwright/test";
import { testCustomer, testPhone } from "../support/data";
import { closeDb, db, testStoreId } from "../support/db";
import { expect, signUp, STORE, staffLogIn, test } from "./support/fixtures";

/*
 * The main screens load with no browser errors or hydration warnings — on a phone whose time
 * zone and clock differ from the store's (a customer travelling, or a phone set to Romania).
 */

test.afterAll(closeDb);
test.use({ timezoneId: "Europe/Bucharest" });

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message.slice(0, 200)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text().slice(0, 200));
  });
  return errors;
}

test("customer screens: sign-up, home with a visit and an unlocked reward, code", async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(`/s/${STORE}/login`);
  const customer = testCustomer();
  await signUp(page, customer);

  const storeId = await testStoreId();
  for (let i = 0; i < 20; i++) {
    await db().query(`select public.earn_points($1, $2, null, gen_random_uuid()::text)`, [
      storeId,
      customer.phone.e164,
    ]);
  }
  await page.reload();
  await expect(page.getByTestId("last-visit")).toContainText("Last visit");
  await page.getByRole("button", { name: "Redeem" }).click();
  await expect(page.getByRole("heading", { name: "Your code" })).toBeVisible();
  // Let a poll or two happen.
  await page.waitForTimeout(3500);
  expect(errors).toEqual([]);
});

test("counter screen: login and a visit", async ({ page }) => {
  const errors = collectErrors(page);
  await staffLogIn(page, "0000", "0000");
  await page.getByLabel("Customer phone number").fill(testPhone().typed);
  await page.getByRole("button", { name: "Add visit (+5)" }).click();
  await expect(page.getByTestId("visit-banner")).toBeVisible();
  expect(errors).toEqual([]);
});
