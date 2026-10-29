// Lighthouse CI (spec §12 M9): scores the production build's public screens as a mid-range
// phone on a slow mobile connection (Lighthouse's default mobile profile). `pnpm lighthouse`.
// Signed-in screens are covered by the Playwright performance budgets (tests/prod).
// Lighthouse CI only reads CommonJS config files, hence require().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium } = require("@playwright/test");

const port = 3300;
const base = `http://localhost:${port}`;

module.exports = {
  ci: {
    collect: {
      startServerCommand: `APP_URL=${base} pnpm start --port ${port}`,
      startServerReadyPattern: "Ready",
      url: [
        `${base}/s/suatu/signup`,
        `${base}/s/suatu/login`,
        `${base}/legal/suatu/program-terms`,
        `${base}/staff/suatu/login`,
        `${base}/dashboard/suatu/login`,
        `${base}/admin/login`,
      ],
      // Three runs per page; the median counts, so one slow run doesn't fail the check.
      numberOfRuns: 3,
      // Playwright's Chrome, so nothing else needs installing.
      chromePath: chromium.executablePath(),
      settings: { chromeFlags: "--headless=new" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        // Store, staff and admin screens ask search engines not to index them on purpose.
        "categories:seo": "off",
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/reports" },
  },
};
