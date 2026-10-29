import { defineConfig, devices } from "@playwright/test";

// Runs against a real production build (`next build && next start`): the production guards
// (0000/0000 refused, dev home gone) and the performance budgets. `pnpm e2e:prod`.
const port = 3200;

export default defineConfig({
  testDir: "./tests/prod",
  globalSetup: "./tests/support/globalSetup.ts",
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    // Production builds take every emailed link from APP_URL (src/server/request.ts).
    env: { APP_URL: `http://localhost:${port}` },
    url: `http://localhost:${port}/legal/privacy`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
