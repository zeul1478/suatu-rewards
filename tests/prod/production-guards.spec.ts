import { at, expect, STORE, test } from "../e2e/support/fixtures";

test.describe("production build guards (§6, §11)", () => {
  test("staff 0000 / 0000 cannot log in until a real password is set", async ({ page }) => {
    await page.goto(`/staff/${STORE}/login`);
    await page.getByLabel("User name").fill("0000");
    await page.getByLabel("Password", { exact: true }).fill("0000");
    await page.getByRole("button", { name: "Log in" }).click();

    // Not signed in: the form asks for a real password first (§6).
    await expect(page.getByText(/This password is temporary/)).toBeVisible();
    await page.goto(`/staff/${STORE}`);
    await expect(page).toHaveURL(at(`/staff/${STORE}/login`));
    await page.goto(`/dashboard/${STORE}`);
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/login`));

    // "0000" again as the new password is refused too.
    await page.goto(`/staff/${STORE}/login`);
    await page.getByLabel("User name").fill("0000");
    await page.getByLabel("Password", { exact: true }).fill("0000");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.getByLabel("Temporary password").fill("0000");
    await page.getByLabel("New password").fill("0000");
    await page.getByRole("button", { name: "Save password and log in" }).click();
    await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
    await page.goto(`/staff/${STORE}`);
    await expect(page).toHaveURL(at(`/staff/${STORE}/login`));
  });

  test("the dev home is a 404 and shows no demo credentials", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(404);
    expect(await page.content()).not.toContain("0000");
  });
});
