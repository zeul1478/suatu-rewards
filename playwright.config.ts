import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
// `pnpm dev:lan` serves HTTPS once `pnpm dev:cert` has made a certificate; tests use the same server.
const https = existsSync("certs/dev-cert.pem");
const baseURL = `${https ? "https" : "http"}://localhost:${port}`;

// Device matrix from spec §10 (iPad both ways: the counter tablet is used portrait and landscape).
// Samsung Internet can't be automated: see docs/TESTING.md.
const deviceProjects = [
  "iPhone SE",
  "iPhone 15 Pro",
  "Pixel 7",
  "Galaxy S9+",
  "iPad (gen 7)",
  "iPad (gen 7) landscape",
  "Desktop Chrome",
  "Desktop Safari",
  "Desktop Firefox",
] as const;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts"],
  // Tests use their own store and clean up after themselves (tests/support/testStore.ts).
  globalSetup: "./tests/support/globalSetup.ts",
  fullyParallel: true,
  // Locally the laptop also runs Docker (Supabase) and the dev server; 4 browsers at a time
  // keeps timings realistic. CI picks its own.
  workers: process.env.CI ? undefined : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // Eight browsers on one laptop: give a busy dev server more than the default 5 s per check.
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    // The dev certificate is trusted on phones, not necessarily by Playwright's browsers.
    ignoreHTTPSErrors: true,
    // The service worker is tested on its own (customer-app.spec.ts); elsewhere it would only
    // add noise, and Playwright's WebKit can't run service workers at all.
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  projects: deviceProjects.map((name) => ({ name, use: { ...devices[name] } })),
  webServer: {
    command: `PORT=${port} node scripts/dev-lan.mjs`,
    url: baseURL,
    ignoreHTTPSErrors: true,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
