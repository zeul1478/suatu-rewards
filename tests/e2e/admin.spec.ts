import { randomBytes } from "node:crypto";
import type { Page } from "@playwright/test";
import { closeDb } from "../support/db";
import { at, dashboardLogIn, expect, openAdmin, STORE, test } from "./support/fixtures";

/*
 * Milestone 8: platform admin (/admin, §11) — stores, owners, audit log. Stores made here are
 * deleted after the run (tests/support/testStore.ts: stores created by the test admin).
 */

test.afterAll(closeDb);

const OWNER_PASSWORD = "temporary-owner-pass";

function newSlug() {
  return `e2e-${randomBytes(4).toString("hex")}`;
}

/** Fills "Add a store" and waits for the new store's page. Returns its slug. */
async function addStore(
  page: Page,
  options: { location?: string; slug?: string; ownerCode?: string } = {},
) {
  const slug = options.slug ?? newSlug();
  await page.goto("/admin/stores/new");
  await page.getByLabel("Store name").fill("Pine Street Gas");
  await page.getByLabel("Web address").fill(slug);
  await page.getByLabel("Location").selectOption(options.location ?? "America/Chicago");
  await page.getByLabel("User name").fill(options.ownerCode ?? "owner1");
  await page.getByLabel("Owner's name").fill("Dana");
  await page.getByLabel("Temporary password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Create store" }).click();
  return slug;
}

test("only a signed-in admin gets in; the store list shows every store", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(at("/admin/login"));

  // A store manager's session is not an admin session.
  await dashboardLogIn(page);
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(at("/admin/login"));

  await openAdmin(page);
  await expect(page.getByRole("link", { name: new RegExp(`/${STORE}`) })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(at("/admin/login"));
  await page.goto("/admin");
  await expect(page).toHaveURL(at("/admin/login"));
});

test("add a store: the owner chooses their own password at first login", async ({ page }) => {
  await openAdmin(page);
  const slug = await addStore(page);
  await expect(page.getByText("Store created.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Pine Street Gas" })).toBeVisible();
  const owner = page.getByRole("region", { name: "Dana" });
  await expect(owner.getByText("Waiting to choose their own password")).toBeVisible();

  await dashboardLogIn(page, "owner1", OWNER_PASSWORD, slug);
  await expect(page.getByLabel("New password")).toBeVisible();
  await page.getByLabel("Temporary password").fill(OWNER_PASSWORD);
  await page.getByLabel("New password").fill("dana-chose-this-one");
  await page.getByRole("button", { name: "Save password and log in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();

  // The starter reward is there, and the customer app opens.
  await page.goto(`/dashboard/${slug}/rewards`);
  await expect(page.getByText("Free coffee").first()).toBeVisible();
  const response = await page.goto(`/s/${slug}/signup`);
  expect(response?.status()).toBe(200);
});

test("a store in Romania speaks Romanian", async ({ page }) => {
  await openAdmin(page);
  const slug = await addStore(page, { location: "Europe/Bucharest" });
  await expect(page.getByText("Store created.", { exact: false })).toBeVisible();

  await page.goto(`/s/${slug}/signup`);
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(page.getByRole("button", { name: "Creează cont" })).toBeVisible();

  await page.goto(`/staff/${slug}/login`);
  await expect(page.getByLabel("Nume de utilizator")).toBeVisible();

  // The admin itself stays in English.
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("pause takes a store offline; switching it back on reopens it", async ({ page }) => {
  await openAdmin(page);
  const slug = await addStore(page);
  await expect(page.getByText("Store created.", { exact: false })).toBeVisible();
  const storePage = page.url();

  await page.getByRole("button", { name: "Pause Pine Street Gas" }).click();
  await expect(page.getByRole("button", { name: "Switch Pine Street Gas back on" })).toBeVisible();
  expect((await page.goto(`/s/${slug}/login`))?.status()).toBe(404);

  await page.goto(storePage);
  await page.getByRole("button", { name: "Switch Pine Street Gas back on" }).click();
  await expect(page.getByRole("button", { name: "Pause Pine Street Gas" })).toBeVisible();
  expect((await page.goto(`/s/${slug}/login`))?.status()).toBe(200);
});

test("the new store's form refuses a taken or reserved address", async ({ page }) => {
  await openAdmin(page);
  await addStore(page, { slug: "suatu" });
  await expect(page.getByText("Another store already uses this address.")).toBeVisible();
  await expect(page.getByLabel("Web address")).toBeFocused();

  await page.getByLabel("Web address").fill("test-mine");
  await page.getByLabel("Temporary password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Create store" }).click();
  await expect(page.getByText(/kept for automated tests/)).toBeVisible();
});

test("audit log: who did what, filtered by store", async ({ page }) => {
  await openAdmin(page);
  await addStore(page);
  await expect(page.getByText("Store created.", { exact: false })).toBeVisible();
  const storeId = new URL(page.url()).pathname.split("/").pop()!;

  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Audit log" })).toBeVisible();
  await page.getByLabel("Store").selectOption(storeId);
  await page.getByRole("button", { name: "Show" }).click();
  const row = page.getByRole("row", { name: /store\.created/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Admin: Test admin");
  await expect(page.getByRole("row")).toHaveCount(2); // header + the one entry
});
