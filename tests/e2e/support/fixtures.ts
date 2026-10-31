import { test as base, expect, type Locator, type Page } from "@playwright/test";
import { testCustomer, testIp } from "../../support/data";
import { TEST_ADMIN, TEST_STORE } from "../../support/testStore";

/**
 * Every test gets its own fake client IP (x-forwarded-for) so per-IP login limits behave as if
 * each test were a different device.
 *
 * page.goto also waits until React has taken over the page (src/components/HydrationMark.tsx).
 * On CI's slow machines the development server can leave seconds between the HTML arriving and
 * the page responding, and a tap in that gap was lost.
 */
export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
    await provide(context);
  },
  page: async ({ page }, provide) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      if (await page.locator('script[src*="/_next/"]').count()) {
        await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
      }
      return response;
    };
    await provide(page);
  },
});

export { expect };

/** Every browser test uses the tests' own store, never the real Suatu (tests/support/testStore.ts). */
export const STORE = TEST_STORE.slug;

/** Matches a URL ending in `path` (for toHaveURL). */
export function at(path: string): RegExp {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

export type TestCustomer = ReturnType<typeof testCustomer>;

/** Fills and submits the sign-up form. Doesn't wait for the result. */
export async function submitSignup(
  page: Page,
  customer: TestCustomer,
  options: { marketing?: boolean; store?: string } = {},
) {
  await page.goto(`/s/${options.store ?? STORE}/signup`);
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

export async function signUp(
  page: Page,
  customer: TestCustomer,
  options: { store?: string; marketing?: boolean } = {},
) {
  await submitSignup(page, customer, options);
  await expect(page.getByRole("heading", { name: `Hi, ${customer.firstName}` })).toBeVisible();
}

export async function submitLogin(page: Page, phone: string, password: string) {
  await page.goto(`/s/${STORE}/login`);
  await page.getByLabel("Phone number").fill(phone);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Log out the customer: the button lives on the Account tab (M5). */
export async function logOut(page: Page) {
  await page.goto(`/s/${STORE}/account`);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(at(`/s/${STORE}/login`));
}

export async function staffLogIn(
  page: Page,
  code: string,
  password: string,
  store: string = STORE,
) {
  await page.goto(`/staff/${store}/login`);
  await page.getByLabel("User name").fill(code);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/**
 * Fast-forward the page's fake clock (page.clock) until `expected` shows. In development, a
 * big jump can make the live-reload connection reconnect and reload the page, which restarts
 * the app's timers; jumping again then measures a full interval from the reload. Each jump is a
 * full `time`, so the check stays "nothing happens before `time` has passed".
 */
export async function fastForwardUntil(page: Page, time: string, expected: Locator) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.clock.fastForward(time);
    try {
      await expect(expected).toBeVisible({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForLoadState("load");
    }
  }
}

/** Owner dashboard login: same accounts as the staff screen, managers only (§6). */
export async function dashboardLogIn(
  page: Page,
  code = "0000",
  password = "0000",
  store: string = STORE,
) {
  await page.goto(`/dashboard/${store}/login`);
  await page.getByLabel("User name").fill(code);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/** Logs in to the dashboard and waits for the overview, so the next page.goto doesn't cut it off. */
export async function openDashboard(page: Page, store: string = STORE) {
  await dashboardLogIn(page, "0000", "0000", store);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
}

/** Platform admin login with the tests' own admin account (tests/support/testStore.ts). */
export async function openAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("User name").fill(TEST_ADMIN.username);
  await page.getByLabel("Password", { exact: true }).fill(TEST_ADMIN.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Stores" })).toBeVisible();
}
