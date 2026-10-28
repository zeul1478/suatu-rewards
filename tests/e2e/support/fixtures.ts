import { test as base, expect, type Page } from "@playwright/test";
import { testCustomer, testIp } from "../../support/data";

/**
 * Every test gets its own fake client IP (x-forwarded-for) so per-IP login limits behave as if
 * each test were a different device.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
    await provide(context);
  },
});

export { expect };

export type TestCustomer = ReturnType<typeof testCustomer>;

/** Fills and submits the sign-up form. Doesn't wait for the result. */
export async function submitSignup(
  page: Page,
  customer: TestCustomer,
  options: { marketing?: boolean } = {},
) {
  await page.goto("/s/suatu/signup");
  await page.getByLabel("Phone number").fill(customer.phone.typed);
  await page.getByLabel("First name").fill(customer.firstName);
  await page.getByLabel("Last name").fill(customer.lastName);
  await page.getByLabel("Email", { exact: true }).fill(customer.email);
  await page.getByLabel("Password", { exact: true }).fill(customer.password);
  await page.getByLabel("I agree to the Program Terms, Terms of Use and Privacy Policy").check();
  await page.getByLabel("I'm 18 or older").check();
  if (options.marketing) await page.getByLabel(/Send me Suatu offers/).check();
  await page.getByRole("button", { name: "Create account" }).click();
}

export async function signUp(page: Page, customer: TestCustomer) {
  await submitSignup(page, customer);
  await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
}

export async function submitLogin(page: Page, phone: string, password: string) {
  await page.goto("/s/suatu/login");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/s\/suatu\/login$/);
}

export async function staffLogIn(page: Page, code: string, password: string) {
  await page.goto("/staff/suatu/login");
  await page.getByLabel("User name").fill(code);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}
