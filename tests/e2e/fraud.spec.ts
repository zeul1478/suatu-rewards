import type { Page } from "@playwright/test";
import { testPhone } from "../support/data";
import { closeDb, createScratchStore } from "../support/db";
import { expect, openDashboard, test } from "./support/fixtures";

/*
 * Stopping points cheating at the counter (DECISIONS D78). Each test changes store-wide
 * settings, so it uses a scratch store of its own.
 */

test.afterAll(closeDb);

async function addVisit(page: Page, phone: string) {
  await page.getByLabel("Customer phone number").fill(phone);
  await page.getByRole("button", { name: "Add visit (+5)" }).click();
}

test("the owner's limits: the counter explains why a visit doesn't count", async ({ page }) => {
  const store = await createScratchStore();
  await openDashboard(page, store.slug);
  await page.goto(`/dashboard/${store.slug}/settings`);

  await page.getByLabel("Most visits per customer per day").fill("0");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Enter a whole number from 1 to 50/)).toBeVisible();

  await page.getByLabel("Most visits per customer per day").fill("2");
  await page.getByLabel("Minutes between two visits of the same customer").fill("30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved. Changes count from the next visit./)).toBeVisible();
  await expect(page.getByLabel("Most visits per customer per day")).toHaveValue("2");

  await page.goto(`/staff/${store.slug}`); // the dashboard login also opens the counter
  const phone = testPhone().typed;
  await addVisit(page, phone);
  await expect(page.getByTestId("visit-banner")).toContainText("+5 points");
  await addVisit(page, phone);
  await expect(page.getByText(/next visit for this number counts in 30 minutes/)).toBeVisible();

  // Empty boxes switch the limits off again.
  await page.goto(`/dashboard/${store.slug}/settings`);
  await page.getByLabel("Most visits per customer per day").fill("");
  await page.getByLabel("Minutes between two visits of the same customer").fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved. Changes count from the next visit./)).toBeVisible();
  await page.goto(`/staff/${store.slug}`);
  await addVisit(page, phone);
  await expect(page.getByTestId("visit-banner")).toContainText("10 / 100");
});

test("a staff member's own number is refused at the counter", async ({ page }) => {
  const store = await createScratchStore();
  const phone = testPhone();
  await openDashboard(page, store.slug);
  await page.goto(`/dashboard/${store.slug}/staff`);

  const me = page.getByRole("region", { name: "Manager (dev)" });
  await me.getByText("Add Manager (dev)'s own phone number").click();
  await me.getByLabel("Their own phone number").fill("12345");
  await me.getByRole("button", { name: "Save phone number" }).click();
  await expect(me.getByText(/doesn't look like a phone number/)).toBeVisible();
  await me.getByLabel("Their own phone number").fill(phone.typed);
  await me.getByRole("button", { name: "Save phone number" }).click();
  await expect(me.getByText(/Visits to Manager \(dev\)'s number are now refused/)).toBeVisible();
  await expect(me.getByText(`Manager (dev)'s phone: ••• ${phone.e164.slice(-4)}`)).toBeVisible();

  await page.goto(`/staff/${store.slug}`); // the dashboard login also opens the counter
  await addVisit(page, phone.typed);
  await expect(page.getByText(/That's a staff member's own number/)).toBeVisible();
  await expect(page.getByTestId("visit-banner")).toHaveCount(0);
});

test("Overview: unusual activity lists a number with many visits in a day", async ({ page }) => {
  const store = await createScratchStore();
  await openDashboard(page, store.slug);
  await expect(page.getByText(/Nothing unusual/)).toBeVisible();

  await page.goto(`/staff/${store.slug}`); // the dashboard login also opens the counter
  const phone = testPhone();
  for (const total of ["5", "10", "15"]) {
    await addVisit(page, phone.typed);
    await expect(page.getByTestId("visit-banner")).toContainText(`${total} / 100`);
  }

  await page.goto(`/dashboard/${store.slug}`);
  const card = page.getByRole("region", { name: "Unusual activity (last 7 days)" });
  await expect(card.getByText("got 3 visits in one day.")).toBeVisible();
  await card.getByRole("link", { name: `••• ${phone.e164.slice(-4)}` }).click();
  await expect(page).toHaveURL(/\/customers\/[0-9a-f-]{36}$/);
});
