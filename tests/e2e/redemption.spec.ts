import { randomInt } from "node:crypto";
import type { Page } from "@playwright/test";
import { testCustomer } from "../support/data";
import { closeDb, createTempStaff, db, expireLock } from "../support/db";
import {
  expect,
  fastForwardUntil,
  newDevice,
  signUp,
  staffLogIn,
  test,
  type TestCustomer,
} from "./support/fixtures";

/* Redemption code cases from §4.3b. Points are given straight in the database to save time. */

test.afterAll(closeDb);

async function giveVisits(phoneE164: string, visits: number) {
  const {
    rows: [store],
  } = await db().query(`select id from public.stores where slug = 'suatu-test'`);
  for (let i = 0; i < visits; i++) {
    await db().query(`select public.earn_points($1, $2, null, gen_random_uuid()::text)`, [
      store.id,
      phoneE164,
    ]);
  }
}

async function customerWithCode(page: Page): Promise<{ customer: TestCustomer; code: string }> {
  const customer = testCustomer();
  await signUp(page, customer);
  await giveVisits(customer.phone.e164, 20);
  await page.reload();
  await page.getByRole("button", { name: "Redeem" }).click();
  const label = await page.getByRole("img", { name: /^Code / }).getAttribute("aria-label");
  return { customer, code: label!.replace(/\D/g, "") };
}

test.describe("redemption codes (§4.3b)", () => {
  test("the code can't be selected or copied", async ({ page }) => {
    await customerWithCode(page);
    const code = page.getByRole("img", { name: /^Code / });
    expect(await code.evaluate((element) => getComputedStyle(element).userSelect)).toBe("none");
    // Retried until React has attached its handlers (a busy test machine can be slower than a hand).
    await expect
      .poll(() =>
        code.evaluate((element) => {
          const event = new Event("copy", { bubbles: true, cancelable: true });
          element.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      )
      .toBe(true);
  });

  test("the countdown reaches 0:00 after 5 minutes and offers a new code", async ({ page }) => {
    await page.clock.install();
    await customerWithCode(page);
    await fastForwardUntil(
      page,
      "05:01",
      page.getByText("This code has expired. Your points are still there."),
    );

    await page.clock.resume();
    await page.getByRole("button", { name: "Get a new code" }).click();
    await expect(page.getByText(/^4:5\d$|^5:00$/)).toBeVisible();
  });

  test("5 wrong codes lock redeeming for that staff member; it unlocks after 15 minutes", async ({
    page,
    browser,
  }) => {
    const { code } = await customerWithCode(page);
    const staffCode = `T${randomInt(100_000, 999_999)}`;
    await createTempStaff(staffCode, "counter password 9");
    const staff = await (await newDevice(browser)).newPage();
    await staffLogIn(staff, staffCode, "counter password 9");
    await expect(staff.getByRole("heading", { name: "Add a visit" })).toBeVisible();

    const wrong = code === "000000" ? "111111" : "000000";
    const codeField = staff.getByLabel("6-digit code from the customer's phone");
    // The same error text can still be on screen from the previous try, so wait until React has
    // finished with each answer (it clears the form) before typing the next code.
    const submit = async (value: string) => {
      await codeField.fill(value);
      await staff.getByRole("button", { name: "Redeem", exact: true }).click();
      await expect(codeField).toHaveValue("");
    };
    for (let attempt = 1; attempt <= 4; attempt++) {
      await submit(wrong);
      await expect(staff.getByText(/That code isn't valid/)).toBeVisible();
    }
    await submit(wrong);
    await expect(staff.getByText(/Redeeming is paused for 15 minutes/)).toBeVisible();

    // The right code is refused while locked…
    await submit(code);
    await expect(staff.getByText(/Redeeming is paused/)).toBeVisible();

    // …and accepted once the lock has run out.
    const {
      rows: [member],
    } = await db().query(`select id from public.staff where staff_code = $1`, [staffCode]);
    await expireLock("redeem_code", member.id);
    await submit(code);
    await expect(staff.getByTestId("redeem-banner")).toContainText("Free coffee redeemed");
    await staff.context().close();
  });

  test("letters or a short code get a clear message", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    const code = page.getByLabel("6-digit code from the customer's phone");
    await code.fill("12a4");
    // Enter, not a click: Linux WebKit on CI never reports the counter's buttons as "stable".
    await code.press("Enter");
    await expect(page.getByText("Enter the 6 digits shown on the customer's phone.")).toBeVisible();
  });
});
