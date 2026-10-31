import { testCustomer } from "../support/data";
import { closeDb, createScratchStore } from "../support/db";
import { latestEmailText } from "../support/mailpit";
import { expect, openDashboard, signUp, test } from "./support/fixtures";

/*
 * Messages (DECISIONS D84): the owner turns an automatic message on and words it, a visit sends
 * it; a special message reaches the customers who agreed to offers; customers switch texts on
 * and off. Emails (Mailpit) are checked rather than texts, which wait for 9:00–20:00 store time.
 * Each test uses a scratch store of its own.
 */

test.afterAll(closeDb);

test("an automatic email goes out with the owner's wording when a visit is added", async ({
  page,
  browser,
}) => {
  const store = await createScratchStore();
  await openDashboard(page, store.slug);
  await page.goto(`/dashboard/${store.slug}/messages`);

  const visit = page.locator("details", { hasText: "Each time the counter adds a visit." });
  await visit.locator("summary").click();
  const email = visit.locator("form").nth(1);
  await email.getByLabel("Send this email").check();
  await email.getByLabel("Email subject").fill("Thanks for stopping by");
  await email.getByLabel("Message").fill("Thanks {first_name}! You have {points} points.");
  // The preview fills the blanks with a sample customer.
  await expect(email.getByText("Thanks Ana! You have 45 points.")).toBeVisible();
  await email.getByRole("button", { name: "Save", exact: true }).click();
  await expect(email.getByText("Saved.")).toBeVisible();
  await expect(visit.locator("summary")).toContainText("Email on");

  const customer = testCustomer();
  const phone = await browser.newPage();
  await signUp(phone, customer, { store: store.slug });
  await phone.close();

  await page.goto(`/staff/${store.slug}`);
  await page.getByLabel("Customer phone number").fill(customer.phone.typed);
  await page.getByLabel("Customer phone number").press("Enter");
  await expect(page.getByTestId("visit-banner")).toContainText("+5 points");

  const text = await latestEmailText(customer.email, { subjectIncludes: "Thanks for stopping by" });
  expect(text).toContain(`Thanks ${customer.firstName}! You have 5 points.`);

  await page.goto(`/dashboard/${store.slug}/messages`);
  const sent = page.locator("section", { has: page.locator("#sent-heading") });
  const latest = sent.getByRole("listitem").first();
  await expect(latest).toContainText("Visit added");
  await expect(latest).toContainText(/Sent$/);
});

test("a special message reaches only customers who agreed to offers", async ({ page, browser }) => {
  const store = await createScratchStore();
  const fan = testCustomer();
  const quiet = testCustomer();
  for (const [customer, marketing] of [
    [fan, true],
    [quiet, false],
  ] as const) {
    const phone = await browser.newPage();
    await signUp(phone, customer, { store: store.slug, marketing });
    await phone.close();
  }

  await openDashboard(page, store.slug);
  await page.goto(`/dashboard/${store.slug}/messages`);
  const form = page.locator("section", { has: page.locator("#special-heading") });
  await form.getByLabel("Email", { exact: true }).check();
  await expect(form.getByText("1 person will get it.")).toBeVisible();
  await form.getByLabel("Email subject").fill("Double points this weekend");
  await form.getByLabel("Message").fill("Hi {first_name}, every visit counts twice!");
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(form.getByText("Tick “Yes, send it” to confirm.")).toBeVisible();
  await form.getByLabel("Yes, send it to 1 person").check();
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(form.getByText("On its way to 1 person.")).toBeVisible();

  const text = await latestEmailText(fan.email, { subjectIncludes: "Double points" });
  expect(text).toContain(`Hi ${fan.firstName}, every visit counts twice!`);
});

test("customers switch point texts and offer texts on and off in Account", async ({ page }) => {
  const store = await createScratchStore();
  await signUp(page, testCustomer(), { store: store.slug });
  await page.goto(`/s/${store.slug}/account`);
  const texts = page.locator("section", { has: page.locator("#texts-heading") });
  await expect(texts.getByText("You don't get texts about your points.")).toBeVisible();
  await texts.getByRole("button", { name: "Text me about my points" }).click();
  await expect(texts.getByText("You get texts about your points.")).toBeVisible();
  await texts.getByRole("button", { name: "Text me offers" }).click();
  await expect(texts.getByText("You get offer texts.")).toBeVisible();
  await texts.getByRole("button", { name: "Stop point texts" }).click();
  await expect(texts.getByText("You don't get texts about your points.")).toBeVisible();
});
