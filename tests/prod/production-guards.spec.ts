import { at, expect, STORE, test } from "../e2e/support/fixtures";
import { TEST_ADMIN } from "../support/testStore";

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

  test("an admin with the password 0000 cannot log in until a real one is set", async ({
    page,
  }) => {
    // The tests' own admin has the development password too (tests/support/testStore.ts).
    await page.goto("/admin/login");
    await page.getByLabel("User name").fill(TEST_ADMIN.username);
    await page.getByLabel("Password", { exact: true }).fill(TEST_ADMIN.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText(/This password is temporary/)).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL(at("/admin/login"));
  });

  test("security headers: nonce scripts run, nothing is blocked, HSTS is on", async ({ page }) => {
    const violations: string[] = [];
    page.on("console", (message) => {
      if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
    });
    const response = await page.goto(`/s/${STORE}/login`);
    const headers = response!.headers();
    expect(headers["content-security-policy"]).not.toContain("unsafe-eval");
    expect(headers["strict-transport-security"]).toContain("max-age=63072000");

    // The page's JavaScript runs under the policy: "Show password" is a React button.
    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    expect(violations).toEqual([]);
  });

  test("the dev home is a 404 and shows no demo credentials", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(404);
    expect(await page.content()).not.toContain("0000");
  });
});
