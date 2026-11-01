import { randomInt } from "node:crypto";
import { testCustomer, testPhone } from "../support/data";
import { closeDb, createTempStaff, db } from "../support/db";
import { expect, newDevice, signUp, staffLogIn, STORE, test } from "./support/fixtures";

/* Milestone 6: recent entries and Void at the counter (spec §6, §11). */

test.afterAll(closeDb);

async function counterAs(page: import("@playwright/test").Page) {
  const code = `T${randomInt(100_000, 999_999)}`;
  await createTempStaff(code, "counter password 7");
  await staffLogIn(page, code, "counter password 7");
  await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
  return code;
}

async function addVisit(page: import("@playwright/test").Page, phone: string) {
  await page.getByLabel("Customer phone number").fill(phone);
  await page.getByRole("button", { name: "Add visit (+5)" }).click();
  await expect(page.getByTestId("visit-banner")).toBeVisible();
}

const recent = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Recent entries" }).getByRole("listitem");

test("recent entries list this cashier's visits, newest first, phones masked", async ({ page }) => {
  await counterAs(page);
  await expect(page.getByText(/No visits added yet/)).toBeVisible();

  const first = testPhone();
  const second = testPhone();
  await addVisit(page, first.typed);
  await addVisit(page, second.typed);

  await expect(recent(page)).toHaveCount(2);
  await expect(recent(page).first()).toContainText(`••• ${second.e164.slice(-4)}`);
  await expect(recent(page).nth(1)).toContainText(`••• ${first.e164.slice(-4)}`);
  // Never the full number on the counter screen.
  await expect(page.getByRole("region", { name: "Recent entries" })).not.toContainText(
    first.e164.slice(2),
  );
});

test("Void undoes a mistaken visit; the customer's phone shows it", async ({ page, browser }) => {
  const customer = testCustomer();
  const customerPage = await (await newDevice(browser)).newPage();
  await signUp(customerPage, customer);

  await counterAs(page);
  await addVisit(page, customer.phone.typed);
  await addVisit(page, customer.phone.typed);
  await expect(page.getByTestId("visit-banner")).toContainText("10 / 100");

  const row = recent(page).first();
  await expect(row).toContainText(`${customer.firstName} ${customer.lastName[0]}.`);
  await row.getByRole("button", { name: /Void the visit/ }).click();
  await expect(row).toContainText("Voided");
  await expect(row.getByRole("button")).toHaveCount(0);

  await expect(customerPage.getByTestId("points-balance")).toHaveText("5", { timeout: 10_000 });
  // Through the tab, as a customer would: the preloaded History is refreshed by the change.
  await customerPage
    .getByRole("navigation")
    .getByRole("link", { name: "History", exact: true })
    .click();
  await expect(customerPage.getByText("Visit cancelled by the store")).toBeVisible();
  await customerPage.context().close();
});

test("after 10 minutes the Void button is gone (server refuses too)", async ({ page }) => {
  const code = await counterAs(page);
  const phone = testPhone();
  await addVisit(page, phone.typed);
  await expect(recent(page).first().getByRole("button", { name: /Void/ })).toBeVisible();

  await db().query(
    `update public.point_transactions set created_at = now() - interval '11 minutes'
     where staff_id = (select id from public.staff where staff_code = $1)`,
    [code],
  );
  await page.reload();
  await expect(recent(page).first()).toContainText(`••• ${phone.e164.slice(-4)}`);
  await expect(recent(page).first().getByRole("button")).toHaveCount(0);
});

test("another cashier's entries aren't listed", async ({ page, browser }) => {
  await counterAs(page);
  await addVisit(page, testPhone().typed);

  const other = await (await newDevice(browser)).newPage();
  await counterAs(other);
  await expect(other.getByText(/No visits added yet/)).toBeVisible();
  await other.context().close();
});
