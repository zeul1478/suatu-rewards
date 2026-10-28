import { randomInt } from "node:crypto";
import {
  ageStaffSessions,
  closeDb,
  createTempStaff,
  expireLock,
  suatuStoreId,
} from "../support/db";
import { expect, staffLogIn, test } from "./support/fixtures";

test.afterAll(closeDb);

const tempCode = () => `T${randomInt(100_000, 999_999)}`;

test.describe("staff screen (§6, §0 step 3)", () => {
  test("0000 / 0000 logs in to the counter screen (development)", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");

    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    await expect(page.getByText("Signed in as Manager (dev)")).toBeVisible();
    const phone = page.getByLabel("Customer phone number");
    await expect(phone).toHaveAttribute("type", "tel");
    await expect(phone).toHaveAttribute("inputmode", "tel");
    await expect(page.getByRole("button", { name: "Add visit (+5)" })).toBeVisible();

    // Big enough for a thumb on a tablet.
    const box = await page.getByRole("button", { name: "Add visit (+5)" }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(56);

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/staff\/suatu\/login$/);
  });

  test("signed-out visitors go to the staff login", async ({ page }) => {
    await page.goto("/staff/suatu");
    await expect(page).toHaveURL(/\/staff\/suatu\/login$/);
  });

  test("wrong password is generic; 5 wrong locks the account, even for the right password", async ({
    page,
  }) => {
    const code = tempCode();
    await createTempStaff(code, "counter password 1");

    for (let attempt = 1; attempt <= 4; attempt++) {
      await staffLogIn(page, code, `nope ${attempt}`);
      await expect(page.getByText("User name or password is incorrect.")).toBeVisible();
    }
    await staffLogIn(page, code, "nope 5");
    await expect(page.getByText("Too many tries. Locked for 15 minutes.")).toBeVisible();

    await staffLogIn(page, code, "counter password 1");
    await expect(page.getByText(/Locked for/)).toBeVisible();

    await expireLock("staff_login", `${await suatuStoreId()}:${code.toLowerCase()}`);
    await staffLogIn(page, code, "counter password 1");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
  });

  test("after 15 minutes idle the session ends", async ({ page }) => {
    const code = tempCode();
    await createTempStaff(code, "counter password 2");
    await staffLogIn(page, code, "counter password 2");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();

    await ageStaffSessions(code, 16);
    await page.reload();
    await expect(page).toHaveURL(/\/staff\/suatu\/login$/);
  });

  test("the screen logs itself out after 15 minutes without a tap", async ({ page }) => {
    await page.clock.install();
    const code = tempCode();
    await createTempStaff(code, "counter password 3");
    await staffLogIn(page, code, "counter password 3");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();

    await page.clock.fastForward("15:01");
    await expect(page).toHaveURL(/\/staff\/suatu\/login\?reason=idle$/);
    await expect(
      page.getByText("You were logged out after 15 minutes without activity."),
    ).toBeVisible();
  });
});
