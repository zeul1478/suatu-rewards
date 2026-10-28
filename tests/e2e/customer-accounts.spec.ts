import { testCustomer, testPhone } from "../support/data";
import { closeDb, createUnclaimedCustomer, customerByPhone } from "../support/db";
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

test.describe("customer accounts (§0 steps 1–2, §4.1–4.2)", () => {
  test("sign up, log out, log in again with the phone typed differently", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);

    await logOut(page);
    // Same number, different format: (AAA) 555-XXXX at sign-up, +1 AAA 555 XXXX at login.
    const e164 = customer.phone.e164;
    await submitLogin(
      page,
      `+1 ${e164.slice(2, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}`,
      customer.password,
    );
    await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();

    const row = await customerByPhone(e164);
    expect(row?.status).toBe("active");
  });

  test("a number staff already entered is claimed, not rejected (§0 step 11)", async ({ page }) => {
    const customer = testCustomer();
    const unclaimedId = await createUnclaimedCustomer(customer.phone.e164);

    await signUp(page, customer);

    const row = await customerByPhone(customer.phone.e164);
    expect(row?.id).toBe(unclaimedId);
    expect(row?.status).toBe("active");
    expect(row?.first_name).toBe(customer.firstName);
  });

  test("a phone that already has an account points to log in", async ({ page }) => {
    const first = testCustomer();
    await signUp(page, first);
    await logOut(page);

    await submitSignup(page, { ...testCustomer(), phone: first.phone });
    await expect(
      page.getByText("This phone number already has an account — log in instead."),
    ).toBeVisible();
  });

  test("an email already in use is rejected", async ({ page }) => {
    const first = testCustomer();
    await signUp(page, first);
    await logOut(page);

    await submitSignup(page, { ...testCustomer(), email: first.email });
    await expect(page.getByText("This email is already used by another account.")).toBeVisible();
  });

  test("empty form: every required field explains itself and focus goes to the first", async ({
    page,
  }) => {
    await page.goto(`/s/${STORE}/signup`);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Please fix the highlighted fields." }),
    ).toBeVisible();
    for (const message of [
      "Enter your phone number.",
      "Enter your first name.",
      "Enter your last name.",
      "Enter your email address.",
      "Use at least 8 characters.",
      "You need to agree to the terms to join.",
      "The program is for adults 18 and older.",
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }
    await expect(page.getByLabel("Phone number")).toBeFocused();
  });

  test("typed values survive a failed submit (but the password doesn't)", async ({ page }) => {
    const customer = testCustomer();
    await submitSignup(page, { ...customer, password: "short" });

    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await expect(page.getByLabel("Phone number")).toHaveValue(customer.phone.typed);
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(customer.email);
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  });

  test("names accept diacritics, hyphens and apostrophes", async ({ page }) => {
    const customer = { ...testCustomer(), firstName: "Ștefan-Ión", lastName: "O'Brâncoveanu" };
    await signUp(page, customer);
  });

  test("fictional and Romanian numbers are accepted; garbage is not", async ({ page }) => {
    await submitSignup(page, { ...testCustomer(), phone: { typed: "12345", e164: "" } });
    await expect(page.getByText(/doesn't look like a phone number/)).toBeVisible();

    const romanian = `+40 7${String(Date.now()).slice(-8)}`;
    const customer = {
      ...testCustomer(),
      phone: { typed: romanian, e164: romanian.replace(/\s/g, "") },
    };
    await signUp(page, customer);
  });

  test("terms open in a sheet without leaving the form", async ({ page }) => {
    await page.goto(`/s/${STORE}/signup`);
    await page.getByLabel("First name").fill("Kept");
    await page.getByRole("button", { name: "Privacy Policy" }).click();

    const sheet = page.getByRole("dialog", { name: "Privacy Policy" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Demo — not for real customers.")).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();

    await expect(sheet).toBeHidden();
    await expect(page.getByLabel("First name")).toHaveValue("Kept");
  });

  test("signed-out visitors are sent to log in; legal pages are public", async ({ page }) => {
    await page.goto(`/s/${STORE}/account`);
    await expect(page).toHaveURL(at(`/s/${STORE}/login`));

    for (const [path, title] of [
      ["/legal/privacy", "Privacy Policy"],
      ["/legal/terms", "Terms of Use"],
      [`/legal/${STORE}/program-terms`, "Suatu Rewards Program Terms"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    }
  });

  test("unknown store is a 404", async ({ page }) => {
    const response = await page.goto(`/s/not-a-store-${testPhone().e164.slice(-4)}/login`);
    expect(response?.status()).toBe(404);
  });
});
