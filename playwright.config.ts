import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;

// Device matrix from spec §10. Samsung Internet can't be automated: see docs/TESTING.md.
const deviceProjects = [
  "iPhone SE",
  "iPhone 15 Pro",
  "Pixel 7",
  "Galaxy S9+",
  "iPad (gen 7) landscape",
  "Desktop Chrome",
  "Desktop Safari",
  "Desktop Firefox",
] as const;

export default defineConfig({
  testDir: "./tests",
  testMatch: ["e2e/**/*.spec.ts", "a11y/**/*.spec.ts"],
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
    trace: "on-first-retry",
  },
  projects: deviceProjects.map((name) => ({ name, use: { ...devices[name] } })),
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
