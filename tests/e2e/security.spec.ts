import { randomBytes } from "node:crypto";
import { testCustomer } from "../support/data";
import { closeDb, db } from "../support/db";
import { expect, openDashboard, signUp, STORE, test } from "./support/fixtures";

/* Milestone 8 security pass (§8): headers on every page, and nothing the policy blocks. */

test.afterAll(closeDb);

const PAGES = [
  `/s/${STORE}/login`,
  `/s/${STORE}/signup`,
  `/staff/${STORE}/login`,
  `/dashboard/${STORE}/login`,
  "/admin/login",
  "/legal/privacy",
];

test("every page sends the security headers, with a fresh nonce each time", async ({ request }) => {
  const nonces = new Set<string>();
  for (const path of PAGES) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const headers = response.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp, path).toContain("default-src 'self'");
    expect(csp, path).toContain("frame-ancestors 'none'");
    expect(csp, path).toContain("object-src 'none'");
    expect(csp, path).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp, path).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    nonces.add(/'nonce-([^']+)'/.exec(csp)![1]!);
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
  expect(nonces.size).toBe(PAGES.length);
});

test("API responses are not sniffed or framed either", async ({ request }) => {
  const response = await request.get(`/api/s/${STORE}/status`);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
});

test("the policy blocks nothing the app itself uses", async ({ page }) => {
  // Collects every Content-Security-Policy violation the browser reports on each page.
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  const violations = () =>
    page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);

  // Customer: sign up (forms, redirects), home with live points, the installable app.
  await signUp(page, testCustomer());
  await page.waitForLoadState("networkidle");
  expect(await violations()).toEqual([]);
  await page.goto(`/s/${STORE}/rewards`);
  await page.waitForLoadState("networkidle");
  expect(await violations()).toEqual([]);

  // Owner dashboard, including the offer form with its picture preview.
  await openDashboard(page);
  expect(await violations()).toEqual([]);
  await page.goto(`/dashboard/${STORE}/offers/new`);
  await page.getByLabel("Title").fill("Coffee + donut $3");
  await page.waitForLoadState("networkidle");
  expect(await violations()).toEqual([]);
  await page.goto(`/dashboard/${STORE}/sign`);
  await page.waitForLoadState("networkidle");
  expect(await violations()).toEqual([]);
});

test("a browser can't choose a store's language with its own header", async ({ request }) => {
  const slug = `test-ro-${randomBytes(3).toString("hex")}`;
  await db().query(
    `insert into public.stores (slug, name, country, timezone, currency, locale)
     values ($1, 'Test RO', 'RO', 'Europe/Bucharest', 'RON', 'ro-RO')`,
    [slug],
  );
  const html = await (
    await request.get("/admin/login", { headers: { "x-suatu-store": slug } })
  ).text();
  expect(html).toContain('lang="en"');
  expect(html).not.toContain("Nume de utilizator");
});
