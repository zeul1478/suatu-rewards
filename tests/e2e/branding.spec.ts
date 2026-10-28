import { expect, staffLogIn, STORE, test } from "./support/fixtures";

/* The brand kit wired into the app (brand/suatu/README.md, spec §5/§9). */

test.describe("branding", () => {
  test("customer screens: logo, favicon, home-screen icon, link preview, behappy credit", async ({
    page,
    request,
  }) => {
    await page.goto(`/s/${STORE}/login`);
    await expect(page.getByRole("img", { name: "Suatu" }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: "Powered by behappy" })).toBeVisible();

    const head = page.locator("head");
    await expect(head.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
      "href",
      "/stores/suatu/svg/favicon.svg",
    );
    await expect(head.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      "href",
      "/stores/suatu/png/apple-touch-icon.png",
    );
    await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/stores\/suatu\/png\/og-image\.png$/,
    );

    for (const href of [
      "/stores/suatu/svg/favicon.svg",
      "/stores/suatu/png/favicon.ico",
      "/stores/suatu/png/apple-touch-icon.png",
      "/stores/suatu/png/og-image.png",
    ]) {
      expect((await request.get(href)).status(), href).toBe(200);
    }
  });

  test("the manifest names the store and its four app icons all load", async ({ request }) => {
    const response = await request.get(`/s/${STORE}/manifest.webmanifest`);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");
    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "Suatu Rewards",
      short_name: "Suatu",
      start_url: `/s/${STORE}`,
      display: "standalone",
      theme_color: "#07231A",
    });
    expect(manifest.icons.map((icon: { purpose: string }) => icon.purpose)).toEqual([
      "any",
      "any",
      "maskable",
      "maskable",
    ]);
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    }
  });

  test("staff screen: light wordmark and the light behappy credit", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Suatu" })).toHaveAttribute(
      "src",
      "/stores/suatu/svg/wordmark-light.svg",
    );
    await expect(page.getByRole("img", { name: "Powered by behappy" })).toHaveAttribute(
      "src",
      "/platform/behappy/powered-by-light.svg",
    );
  });

  test("brand icons follow the theme: lime details on dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(`/s/${STORE}/login`);
    const accent = await page
      .getByRole("button", { name: "Show password" })
      .locator("svg")
      .evaluate((svg) => getComputedStyle(svg).getPropertyValue("--icon-accent").trim());
    expect(accent.toLowerCase()).toBe("#c6f06a");
  });
});
