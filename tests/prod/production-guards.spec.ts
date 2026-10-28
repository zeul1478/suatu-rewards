import { at, expect, STORE, test } from "../e2e/support/fixtures";

test.describe("production build guards (§6, §11)", () => {
  test("staff 0000 / 0000 cannot log in", async ({ page }) => {
    await page.goto(`/staff/${STORE}/login`);
    await page.getByLabel("User name").fill("0000");
    await page.getByLabel("Password", { exact: true }).fill("0000");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByText(/still has the development password/)).toBeVisible();
    await page.goto(`/staff/${STORE}`);
    await expect(page).toHaveURL(at(`/staff/${STORE}/login`));
  });

  test("the dev home is a 404 and shows no demo credentials", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(404);
    expect(await page.content()).not.toContain("0000");
  });
});
