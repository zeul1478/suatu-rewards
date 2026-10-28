import { gzipSync } from "node:zlib";
import type { CDPSession, Page } from "@playwright/test";
import { testCustomer } from "../support/data";
import { STORE, expect, signUp, test } from "../e2e/support/fixtures";

/*
 * Performance budgets (spec §10), on the production build, emulating a mid-range phone on a
 * slow mobile connection (Lighthouse's "Slow 4G" + 4× CPU slowdown).
 *   LCP < 2.5 s · CLS < 0.1 · initial JavaScript for the customer home < 150 KB gzipped.
 * INP needs real taps on a real phone; it's on the manual checklist (docs/TESTING.md).
 */

const JS_BUDGET_BYTES = 150 * 1024;
const LCP_BUDGET_MS = 2500;
const CLS_BUDGET = 0.1;

async function throttle(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  return cdp;
}

/** LCP and CLS as the browser measured them for the current page load. */
async function webVitals(page: Page): Promise<{ lcp: number; cls: number }> {
  return page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) cls += entry.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve({ lcp, cls }), 1000);
      }),
  );
}

/** Total gzipped size of the JavaScript a page load downloads. */
function collectScripts(page: Page): () => number {
  const sizes: number[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try {
      sizes.push(gzipSync(await response.body()).length);
    } catch {
      // Redirects have no body.
    }
  });
  return () => sizes.reduce((sum, size) => sum + size, 0);
}

test.describe("performance budgets (production build, slow phone)", () => {
  test.use({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });

  test("log in screen", async ({ page }) => {
    await throttle(page);
    await page.goto(`/s/${STORE}/login`, { waitUntil: "load" });
    const { lcp, cls } = await webVitals(page);
    test
      .info()
      .annotations.push({ type: "LCP / CLS", description: `${Math.round(lcp)} ms / ${cls}` });
    expect(lcp).toBeLessThan(LCP_BUDGET_MS);
    expect(cls).toBeLessThan(CLS_BUDGET);
  });

  test("customer home: speed, stability and JavaScript size", async ({ page }) => {
    await signUp(page, testCustomer());

    // Measure a fresh load of the home, as when the customer opens the app.
    await page.context().clearCookies({ name: /^(?!suatu-auth)/ });
    const scriptBytes = collectScripts(page);
    await throttle(page);
    await page.goto(`/s/${STORE}`, { waitUntil: "load" });
    await expect(page.getByTestId("points-balance")).toBeVisible();
    const { lcp, cls } = await webVitals(page);
    const js = scriptBytes();
    test.info().annotations.push({
      type: "LCP / CLS / JS",
      description: `${Math.round(lcp)} ms / ${cls} / ${Math.round(js / 1024)} KB gzipped`,
    });

    expect(lcp).toBeLessThan(LCP_BUDGET_MS);
    expect(cls).toBeLessThan(CLS_BUDGET);
    expect(js).toBeLessThan(JS_BUDGET_BYTES);
  });
});
