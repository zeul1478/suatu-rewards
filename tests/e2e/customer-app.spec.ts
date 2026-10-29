import type { Page } from "@playwright/test";
import { testCustomer, testEmail } from "../support/data";
import { closeDb, db, testStoreId } from "../support/db";
import { firstLink, latestEmailText } from "../support/mailpit";
import {
  at,
  expect,
  signUp,
  STORE,
  submitLogin,
  submitSignup,
  test,
  type TestCustomer,
} from "./support/fixtures";

/* Milestone 5: the complete customer app (spec §4.4, §11). */

test.afterAll(closeDb);

async function giveVisits(customer: TestCustomer, visits: number) {
  const storeId = await testStoreId();
  for (let i = 0; i < visits; i++) {
    await db().query(`select public.earn_points($1, $2, null, gen_random_uuid()::text)`, [
      storeId,
      customer.phone.e164,
    ]);
  }
}

const tab = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Main" }).getByRole("link", { name });

test.describe("tab bar", () => {
  test("Home · Rewards · History · Account, with the current tab marked", async ({ page }) => {
    await signUp(page, testCustomer());
    await expect(tab(page, "Home")).toHaveAttribute("aria-current", "page");

    for (const [name, path, heading] of [
      ["Rewards", "/rewards", "Rewards"],
      ["History", "/history", "History"],
      ["Account", "/account", "Account"],
      ["Home", "", "Hi, Testa"],
    ] as const) {
      await tab(page, name).click();
      await expect(page).toHaveURL(at(`/s/${STORE}${path}`));
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(tab(page, name)).toHaveAttribute("aria-current", "page");
    }
  });

  test("the last thing on a page isn't hidden behind the tab bar", async ({ page }) => {
    await signUp(page, testCustomer());
    await page.goto(`/s/${STORE}/account`);
    const deleteToggle = page.locator("summary", { hasText: "Delete my account" });
    await deleteToggle.scrollIntoViewIfNeeded();
    const nav = await page.getByRole("navigation", { name: "Main" }).boundingBox();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const box = await deleteToggle.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y);
  });
});

test.describe("rewards and history", () => {
  test("rewards: points to go, then Redeem at 100", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await giveVisits(customer, 3);
    await page.goto(`/s/${STORE}/rewards`);
    await expect(page.getByText("You have 15 points.")).toBeVisible();
    await expect(page.getByText("85 more points (17 visits) to go")).toBeVisible();

    await giveVisits(customer, 17);
    await page.reload();
    await page.getByRole("button", { name: "Redeem" }).click();
    await expect(page.getByRole("heading", { name: "Your code" })).toBeVisible();
  });

  test("history: empty at first, then visits and the coffee, newest first", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await page.goto(`/s/${STORE}/history`);
    await expect(page.getByText(/No visits yet/)).toBeVisible();

    await giveVisits(customer, 20);
    const storeId = await testStoreId();
    const {
      rows: [row],
    } = await db().query(
      `select c.id as customer_id, r.id as reward_id, s.id as staff_id
       from public.customers c, public.rewards r, public.staff s
       where c.phone_e164 = $1 and r.store_id = $2 and s.store_id = $2 and s.staff_code = '0000'`,
      [customer.phone.e164, storeId],
    );
    const {
      rows: [created],
    } = await db().query(`select public.create_redemption($1, $2, $3) as r`, [
      storeId,
      row.customer_id,
      row.reward_id,
    ]);
    await db().query(`select public.complete_redemption($1, $2, $3)`, [
      storeId,
      created.r.code,
      row.staff_id,
    ]);

    await page.reload();
    const items = page.getByRole("main").getByRole("listitem");
    await expect(items).toHaveCount(21);
    await expect(items.first()).toContainText("Free coffee redeemed");
    await expect(items.first()).toContainText("−100");
    await expect(items.nth(1)).toContainText("Visit");
    await expect(items.nth(1)).toContainText("+5");
  });
});

test.describe("account (§4.4)", () => {
  test("edit name; a new email needs confirming; someone else's email is refused", async ({
    page,
  }) => {
    const other = testCustomer();
    await signUp(page, other);
    await page.goto(`/s/${STORE}/account`);
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(at(`/s/${STORE}/login`));

    const customer = testCustomer();
    await signUp(page, customer);
    await page.goto(`/s/${STORE}/account`);

    await page.getByLabel("First name").fill("Renamed");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Details saved.")).toBeVisible();
    await page.goto(`/s/${STORE}`);
    await expect(page.getByRole("heading", { name: "Hi, Renamed" })).toBeVisible();

    await page.goto(`/s/${STORE}/account`);
    await page.getByLabel("Email", { exact: true }).fill(other.email);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("This email is already used by another account.")).toBeVisible();

    const newEmail = testEmail();
    await page.getByLabel("Email", { exact: true }).fill(newEmail);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText(/We've sent a link to confirm your new email/)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Your email isn't confirmed yet/)).toBeVisible();

    await page.goto(firstLink(await latestEmailText(newEmail, { subjectIncludes: "Confirm" })));
    await expect(page.getByText("Thanks — your email is confirmed.")).toBeVisible();
  });

  test("offer emails on and off, each change recorded", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await page.goto(`/s/${STORE}/account`);
    await expect(page.getByText(/You don't get offer emails/)).toBeVisible();

    await page.getByRole("button", { name: "Send me offer emails" }).click();
    await expect(page.getByText(/You get Suatu offers by email/)).toBeVisible();
    await page.getByRole("button", { name: "Stop offer emails" }).click();
    await expect(page.getByText(/You don't get offer emails/)).toBeVisible();

    const { rows } = await db().query(
      `select granted, source from public.consent_events ce join public.customers c on c.id = ce.customer_id
       where c.phone_e164 = $1 and ce.kind = 'marketing_email' order by ce.created_at`,
      [customer.phone.e164],
    );
    expect(rows).toEqual([
      { granted: false, source: "signup" },
      { granted: true, source: "account" },
      { granted: false, source: "account" },
    ]);
  });

  test("download my data: a JSON file with everything, and no password", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await giveVisits(customer, 2);
    await page.goto(`/s/${STORE}/account`);

    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download my data" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^suatu-test-my-data-\d{4}-\d{2}-\d{2}\.json$/);

    const response = await page.request.get(`/api/s/${STORE}/account/export`);
    const text = await response.text();
    const data = JSON.parse(text);
    expect(data.profile).toMatchObject({ phone_e164: customer.phone.e164, email: customer.email });
    expect(data.pointsHistory).toHaveLength(2);
    expect(data.consents.length).toBeGreaterThanOrEqual(5);
    expect(text).not.toContain(customer.password);
    expect(text.toLowerCase()).not.toContain("password");

    await page.context().clearCookies();
    expect((await page.request.get(`/api/s/${STORE}/account/export`)).status()).toBe(401);
  });

  test("delete my account: needs the password, erases personal data, keeps the history", async ({
    page,
  }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await giveVisits(customer, 3);
    const {
      rows: [before],
    } = await db().query(`select id from public.customers where phone_e164 = $1`, [
      customer.phone.e164,
    ]);

    await page.goto(`/s/${STORE}/account`);
    await page.locator("summary", { hasText: "Delete my account" }).click();
    await page.getByLabel("Your password, to confirm").fill("not my password");
    await page.getByRole("button", { name: "Delete my account for good" }).click();
    await expect(page.getByText("That's not your current password.")).toBeVisible();

    await page.getByLabel("Your password, to confirm").fill(customer.password);
    await page.getByRole("button", { name: "Delete my account for good" }).click();
    await expect(page).toHaveURL(at(`/s/${STORE}/signup?deleted=1`));
    await expect(page.getByText(/Your account was deleted/)).toBeVisible();

    const {
      rows: [after],
    } = await db().query(
      `select status, phone_e164, email, first_name, last_name, auth_user_id,
              (select count(*)::int from public.point_transactions where customer_id = $1) as ledger
       from public.customers where id = $1`,
      [before.id],
    );
    expect(after).toEqual({
      status: "deleted",
      phone_e164: null,
      email: null,
      first_name: null,
      last_name: null,
      auth_user_id: null,
      ledger: 3,
    });

    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();

    // The number is free again: a new sign-up starts from zero.
    await submitSignup(page, { ...testCustomer(), phone: customer.phone });
    await expect(page.getByTestId("points-balance")).toHaveText("0");
  });
});

test.describe("installable app", () => {
  test("the offline page is self-contained and branded", async ({ request }) => {
    const response = await request.get(`/s/${STORE}/offline`);
    const html = await response.text();
    expect(html).toContain("You're offline");
    // The logo is inside the page itself: vector markup or a data: picture.
    expect(html).toMatch(/<svg|<img src="data:image\/png;base64,/);
    expect(html).not.toMatch(/<script|<link[^>]+stylesheet|src="\/_next/);
  });

  test("the service worker is served fresh", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.headers()["cache-control"]).toContain("no-cache");
  });

  test("Add to Home Screen: Share-sheet steps on iPhone, browser menu elsewhere", async ({
    page,
    browserName,
    isMobile,
  }) => {
    await signUp(page, testCustomer());
    await page.goto(`/s/${STORE}/account`);
    const install = page.getByRole("region", { name: "Add to Home Screen" });
    if (browserName === "webkit" && isMobile) {
      await expect(install.getByText(/tap the Share button/)).toBeVisible();
    } else {
      await expect(
        install.getByText(/Install app or Add to Home screen|Install the app/),
      ).toBeVisible();
    }
  });
});
