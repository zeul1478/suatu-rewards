import type { Browser, Page } from "@playwright/test";
import { testCustomer, testIp, testPhone } from "../support/data";
import { closeDb } from "../support/db";
import { expect, logOut, signUp, staffLogIn, submitLogin, test } from "./support/fixtures";

/*
 * Spec §0, end to end: a customer's phone and the counter tablet side by side.
 * Runs on every device project (the customer side uses that device; the counter is the same
 * device type too, which also covers "works on a phone").
 */

test.afterAll(closeDb);

/** The app polls every 3 s (§0 step 5); the rest is slack for a laptop running 8 browsers. */
const LIVE_UPDATE_MS = 10_000;
test.setTimeout(120_000);

async function counter(browser: Browser, deviceOptions: object): Promise<Page> {
  const context = await browser.newContext({
    ...deviceOptions,
    extraHTTPHeaders: { "x-forwarded-for": testIp() },
  });
  const page = await context.newPage();
  await staffLogIn(page, "0000", "0000");
  await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
  return page;
}

async function addVisit(staff: Page, phone: string) {
  await staff.getByLabel("Customer phone number").fill(phone);
  await staff.getByRole("button", { name: "Add visit (+5)" }).click();
}

const balance = (page: Page) => page.getByTestId("points-balance");
const banner = (staff: Page) => staff.getByTestId("visit-banner");

test("§0 golden path: sign up, earn 20 visits live, redeem, unknown number, claim", async ({
  page: customerPage,
  browser,
  viewport,
  userAgent,
  isMobile,
  hasTouch,
  deviceScaleFactor,
}) => {
  const customer = testCustomer();
  const digits = customer.phone.e164.slice(2); // e.g. 2015550142
  const formats = [
    `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`,
    digits,
    `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`,
  ];

  // 1. Create account → 0 / 100.
  await signUp(customerPage, customer);
  await expect(balance(customerPage)).toHaveText("0");
  await expect(customerPage.getByText("20 more visits to a Free coffee")).toBeVisible();

  // 2. Log out, log in with phone + password → same account, 0 / 100.
  await logOut(customerPage);
  await submitLogin(customerPage, customer.phone.typed, customer.password);
  await expect(balance(customerPage)).toHaveText("0");

  // 3. Counter screen with 0000 / 0000.
  const staff = await counter(browser, {
    viewport,
    userAgent,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  });

  // 4. Any format → banner with name, score and visits to go.
  await addVisit(staff, formats[0]!);
  await expect(banner(staff)).toHaveText(
    `+5 points · ${customer.firstName} ${customer.lastName[0]}. · 5 / 100 · 19 more visits to a Free coffee`,
  );

  // 5. The customer's screen updates on its own within a few seconds, gauge at 5%.
  await expect(balance(customerPage)).toHaveText("5", { timeout: LIVE_UPDATE_MS });
  await expect(customerPage.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");

  // 6. 19 more, quickly, in all four formats: every entry adds +5.
  for (let visit = 2; visit <= 20; visit++) {
    await addVisit(staff, formats[visit % 4]!);
    await expect(banner(staff)).toContainText(`· ${visit * 5} / 100`);
  }

  // 7. At 100: unlocked on the phone, "Reward available" at the counter.
  await expect(staff.getByText("Reward available: Free coffee")).toBeVisible();
  await expect(customerPage.getByText("Free coffee unlocked")).toBeVisible({
    timeout: LIVE_UPDATE_MS,
  });
  await expect(balance(customerPage)).toHaveText("100");

  // 8. Redeem → large 6-digit code with a 5-minute countdown.
  await customerPage.getByRole("button", { name: "Redeem" }).click();
  await expect(customerPage.getByRole("heading", { name: "Your code" })).toBeVisible();
  const codeLabel = await customerPage
    .getByRole("img", { name: /^Code / })
    .getAttribute("aria-label");
  const code = codeLabel!.replace(/\D/g, "");
  expect(code).toMatch(/^\d{6}$/);
  await expect(customerPage.getByText(/^4:5\d$|^5:00$/)).toBeVisible();

  // 9. Staff types the code → redeemed; the phone shows it and the balance is back to 0.
  await staff.getByLabel("6-digit code from the customer's phone").fill(code);
  await staff.getByRole("button", { name: "Redeem", exact: true }).click();
  await expect(staff.getByTestId("redeem-banner")).toHaveText(
    `Free coffee redeemed for ••• ${digits.slice(-4)}`,
  );
  await expect(customerPage.getByText("Enjoy your Free coffee!")).toBeVisible({
    timeout: LIVE_UPDATE_MS,
  });
  await customerPage.getByRole("link", { name: "Back to home" }).click();
  await expect(balance(customerPage)).toHaveText("0");

  // 10. A number never seen before → new account on the spot, 5 / 100.
  const stranger = testPhone();
  await addVisit(staff, stranger.typed);
  await expect(banner(staff)).toHaveText(
    "New customer · +5 points · 5 / 100 · 19 more visits to a Free coffee",
  );
  await expect(
    staff.getByText("They can sign up with this number to see their points."),
  ).toBeVisible();

  // 11. Someone signs up with that number → they see the 5 points already earned.
  await logOut(customerPage);
  await signUp(customerPage, { ...testCustomer(), phone: stranger, firstName: "Nouă" });
  await expect(balance(customerPage)).toHaveText("5");

  await staff.context().close();
});

test("a double tap on Add visit counts once", async ({ page: staff }) => {
  await staffLogIn(staff, "0000", "0000");
  await expect(staff.getByRole("heading", { name: "Add a visit" })).toBeVisible();
  const phone = testPhone();
  await staff.getByLabel("Customer phone number").fill(phone.typed);
  await staff.getByRole("button", { name: "Add visit (+5)" }).dblclick();
  await expect(banner(staff)).toContainText("· 5 / 100");

  await staff.getByLabel("Customer phone number").fill(phone.typed);
  await staff.getByRole("button", { name: "Add visit (+5)" }).click();
  await expect(banner(staff)).toContainText("· 10 / 100");
});

test("a mistyped number is kept in the field with an explanation", async ({ page: staff }) => {
  await staffLogIn(staff, "0000", "0000");
  await expect(staff.getByRole("heading", { name: "Add a visit" })).toBeVisible();
  await staff.getByLabel("Customer phone number").fill("12345");
  await staff.getByRole("button", { name: "Add visit (+5)" }).click();
  await expect(staff.getByText(/doesn't look like a phone number/)).toBeVisible();
  await expect(staff.getByLabel("Customer phone number")).toHaveValue("12345");
});
