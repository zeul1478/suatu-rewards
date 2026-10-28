import { defineConfig, devices } from "@playwright/test";

// Runs against a real production build (`next build && next start`) to prove the production
// guards: 0000/0000 refused, dev home gone. `pnpm e2e:prod`.
const port = 3200;

export default defineConfig({
  testDir: "./tests/prod",
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: `http://localhost:${port}/legal/privacy`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
