import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Saved screenshots of the main screens (spec §10). `pnpm e2e:visual` compares against them;
// `pnpm e2e:visual:update` accepts the current look after a deliberate design change.
// Baselines are per operating system (fonts render differently): these are the macOS ones.
const projects = [
  "iPhone SE",
  "iPhone 15 Pro",
  "Pixel 7",
  "iPad (gen 7)",
  "iPad (gen 7) landscape",
  "Desktop Chrome",
] as const;

export default defineConfig({
  ...base,
  testDir: "./tests/visual",
  testMatch: "**/*.spec.ts",
  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",
  expect: {
    ...base.expect,
    toHaveScreenshot: {
      // Tight: a whole changed section on a tall page can be under 1% of its pixels.
      maxDiffPixelRatio: 0.002,
      animations: "disabled",
      caret: "hide",
      stylePath: "./tests/visual/hide-dev-tools.css",
    },
  },
  projects: projects.map((name) => ({ name, use: { ...devices[name] } })),
});
