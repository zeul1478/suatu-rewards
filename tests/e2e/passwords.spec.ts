import { testCustomer } from "../support/data";
import { ageRecoveryEmail, closeDb, expireLock } from "../support/db";
import { emailCount, firstLink, latestEmailText } from "../support/mailpit";
import {
  at,
  expect,
  logOut,
  signUp,
  STORE,
  submitLogin,
  submitSignup,
  test,
} from "./support/fixtures";

test.afterAll(closeDb);

const passwordField = (page: import("@playwright/test").Page, name = "Password") =>
  page.getByLabel(name, { exact: true });

test.describe("password rules (§4.3, §4.3b)", () => {
  test("7 characters rejected, 8 accepted", async ({ page }) => {
    const customer = testCustomer();
    await submitSignup(page, { ...customer, password: "pumpgas" });
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();

    await signUp(page, { ...customer, password: "pumpgas9" });
  });

  test("64 accepted with spaces, emoji and diacritics; 65 rejected", async ({ page }) => {
    const customer = testCustomer();
    const sixtyFour = ` ș ț ă 🚗⛽ ${"cafea ".repeat(9)}`.padEnd(64, "x");
    expect([...sixtyFour]).toHaveLength(64);

    await submitSignup(page, { ...customer, password: `${sixtyFour}y` });
    await expect(page.getByText("Use 64 characters or fewer.")).toBeVisible();

    await signUp(page, { ...customer, password: sixtyFour });
    await logOut(page);
    await submitLogin(page, customer.phone.typed, sixtyFour);
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
  });

  test("leading and trailing spaces are part of the password", async ({ page }) => {
    const customer = { ...testCustomer(), password: "  coffee at dawn  " };
    await signUp(page, customer);
    await logOut(page);

    await submitLogin(page, customer.phone.typed, "coffee at dawn");
    await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();

    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
  });

  test("common password, phone number and email are rejected", async ({ page }) => {
    const customer = testCustomer();
    await submitSignup(page, { ...customer, password: "password123" });
    await expect(page.getByText(/This password is too common/)).toBeVisible();

    await submitSignup(page, { ...customer, password: customer.phone.e164.slice(2) });
    await expect(page.getByText("Don't use your phone number as your password.")).toBeVisible();

    await submitSignup(page, { ...customer, password: customer.email });
    await expect(page.getByText("Don't use your email address as your password.")).toBeVisible();
  });

  test("show/hide keeps the cursor; copy and cut are blocked; paste is allowed", async ({
    page,
  }) => {
    await page.goto(`/s/${STORE}/signup`);
    const input = passwordField(page);
    await input.fill("abcdefgh");
    await input.evaluate((element: HTMLInputElement) => element.setSelectionRange(3, 3));

    await page.getByRole("button", { name: "Show password" }).click();
    await expect(input).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(await input.evaluate((element: HTMLInputElement) => element.selectionStart)).toBe(3);

    // While visible, copying and cutting are still cancelled; pasting is not.
    const cancelled = await input.evaluate((element) =>
      ["copy", "cut", "paste"].map((type) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    );
    expect(cancelled).toEqual([true, true, false]);

    await expect(input).toHaveAttribute("autocomplete", "new-password");
    await expect(input).toHaveAttribute("autocorrect", "off");
    await expect(input).toHaveAttribute("autocapitalize", "off");
    await expect(input).toHaveAttribute("spellcheck", "false");
  });

  test("the password never shows up in the page, URL, storage, cookies or responses", async ({
    page,
    context,
  }) => {
    const customer = testCustomer();
    const bodies: string[] = [];
    page.on("response", async (response) => {
      try {
        bodies.push(await response.text());
      } catch {
        // Redirects and aborted requests have no body.
      }
    });

    await signUp(page, customer);
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain(encodeURIComponent(customer.password));
    expect(await page.content()).not.toContain(customer.password);
    const storage = await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    );
    expect(storage).not.toContain(customer.password);
    const cookies = JSON.stringify(await context.cookies());
    expect(cookies).not.toContain(encodeURIComponent(customer.password));
    expect(cookies).not.toContain(customer.password);
    for (const body of bodies) expect(body).not.toContain(customer.password);
  });
});

test.describe("login lockout (§4.2)", () => {
  test("wrong password gives a generic error; 5 wrong locks for 15 min; unlocks after", async ({
    page,
  }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await logOut(page);

    for (let attempt = 1; attempt <= 4; attempt++) {
      await submitLogin(page, customer.phone.typed, `wrong password ${attempt}`);
      await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();
    }
    await submitLogin(page, customer.phone.typed, "wrong password 5");
    await expect(page.getByText(/This account is locked for 15 minutes/)).toBeVisible();

    // Even the right password is refused while locked.
    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByText(/This account is locked/)).toBeVisible();

    // Fake clock: the 15 minutes pass.
    await expireLock("customer_phone", customer.phone.e164);
    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
  });

  test("an unknown phone gets the same generic error", async ({ page }) => {
    await submitLogin(page, testCustomer().phone.typed, "any password at all");
    await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();
  });
});

test.describe("change password (§4.3b)", () => {
  test("needs the current password and signs out other devices", async ({ page, browser }) => {
    const customer = testCustomer();
    await signUp(page, customer);

    // A second device, logged in to the same account.
    const otherDevice = await browser.newContext();
    const otherPage = await otherDevice.newPage();
    await submitLogin(otherPage, customer.phone.typed, customer.password);
    await expect(
      otherPage.getByRole("heading", { name: `Hi, ${customer.firstName}` }),
    ).toBeVisible();

    await page.goto(`/s/${STORE}/account`);
    await passwordField(page, "Current password").fill("not my password");
    await passwordField(page, "New password").fill("a brand new phrase");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("That's not your current password.")).toBeVisible();

    await passwordField(page, "Current password").fill(customer.password);
    await passwordField(page, "New password").fill("a brand new phrase");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(
      page.getByText("Password changed. Other devices have been logged out."),
    ).toBeVisible();

    await otherPage.goto(`/s/${STORE}`);
    await expect(otherPage).toHaveURL(at(`/s/${STORE}/login`));
    await otherDevice.close();

    // This device stays signed in; the old password no longer works.
    await page.goto(`/s/${STORE}`);
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
    await logOut(page);
    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();
    await submitLogin(page, customer.phone.typed, "a brand new phrase");
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
  });
});

test.describe("forgot password (§4.2, §4.3b)", () => {
  async function requestReset(page: import("@playwright/test").Page, phone: string) {
    await page.goto(`/s/${STORE}/forgot-password`);
    await page.getByLabel("Phone number").fill(phone);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByText(/If that number has an account/)).toBeVisible();
  }

  test("the emailed link works once and the old password stops working", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await logOut(page);

    await requestReset(page, customer.phone.typed);
    const link = firstLink(await latestEmailText(customer.email, { subjectIncludes: "Reset" }));

    await page.goto(link);
    await passwordField(page, "New password").fill("fresh start phrase");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Password updated. You're logged in.")).toBeVisible();

    // Second use of the same link is refused.
    await logOut(page);
    await page.goto(link);
    await passwordField(page, "New password").fill("another phrase again");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/This link has expired or was already used/)).toBeVisible();

    await submitLogin(page, customer.phone.typed, customer.password);
    await expect(page.getByText("Phone number or password is incorrect.")).toBeVisible();
    await submitLogin(page, customer.phone.typed, "fresh start phrase");
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
  });

  test("a link older than 60 minutes is refused", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await logOut(page);

    await requestReset(page, customer.phone.typed);
    const link = firstLink(await latestEmailText(customer.email, { subjectIncludes: "Reset" }));
    await ageRecoveryEmail(customer.email, 61);

    await page.goto(link);
    await passwordField(page, "New password").fill("too late phrase");
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText(/This link has expired or was already used/)).toBeVisible();
  });

  test("an unknown number gets the same answer and no email", async ({ page }) => {
    const stranger = testCustomer();
    await requestReset(page, stranger.phone.typed);
    expect(await emailCount(stranger.email, "Reset")).toBe(0);
  });

  test("sign-up sends an email confirmation link that works", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    const link = firstLink(await latestEmailText(customer.email, { subjectIncludes: "Confirm" }));
    await page.goto(link);
    await expect(page.getByText("Thanks — your email is confirmed.")).toBeVisible();
    await page.goto(`/s/${STORE}/account`);
    await expect(page.getByText("Your email is confirmed.")).toBeVisible();
  });
});
