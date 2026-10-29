import { testCustomer } from "../support/data";
import { closeDb } from "../support/db";
import { expect, signUp, STORE, test } from "./support/fixtures";

/*
 * With no connection, the installed app shows its offline page instead of the browser's error
 * (service worker, public/sw.js). Chromium only: Playwright's WebKit can't run service workers.
 * Over the dev server's local HTTPS, Chrome installs a service worker only if it trusts the
 * certificate — phones do after the one-time setup; the test browser is told to.
 */

test.afterAll(closeDb);
test.skip(({ browserName }) => browserName !== "chromium", "Service workers need Chromium here");
test.use({ serviceWorkers: "allow", launchOptions: { args: ["--ignore-certificate-errors"] } });

test("with no connection, the app shows its offline page — Home included", async ({
  page,
  context,
}) => {
  await signUp(page, testCustomer());
  // The worker covers the whole store, Home (/s/<store>) included.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  for (const path of ["", "/history"]) {
    await page.goto(`/s/${STORE}${path}`).catch(() => undefined);
    await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  }
  await context.setOffline(false);
});
