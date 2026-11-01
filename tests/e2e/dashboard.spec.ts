import { randomInt } from "node:crypto";
import { deflateSync } from "node:zlib";
import { testCustomer, testPhone } from "../support/data";
import { closeDb, createScratchStore, createTempStaff, db, testStoreId } from "../support/db";
import {
  at,
  dashboardLogIn,
  expect,
  newDevice,
  openDashboard,
  signUp,
  staffLogIn,
  STORE,
  test,
} from "./support/fixtures";

/* Milestone 7: the owner dashboard (spec §6, §11). */

test.afterAll(closeDb);

const tempCode = () => `T${randomInt(100_000, 999_999)}`;

async function earnAt(storeId: string, phoneE164: string, visits = 1): Promise<string> {
  let customerId = "";
  for (let i = 0; i < visits; i++) {
    const { rows } = await db().query(
      `select public.earn_points($1, $2, null, gen_random_uuid()::text) as r`,
      [storeId, phoneE164],
    );
    customerId = rows[0].r.customer_id;
  }
  return customerId;
}

/** A tiny valid PNG (solid green), so the upload test needs no fixture file. */
function greenPng(size = 32): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(size * 3, Buffer.from([0x1e, 0x7a, 0x4f])),
  ]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: size }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", pixels),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test.describe("access (§6: managers only)", () => {
  test("signed out → the dashboard login; 0000 / 0000 opens the overview", async ({ page }) => {
    await page.goto(`/dashboard/${STORE}/customers`);
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/login`));

    await dashboardLogIn(page);
    await expect(page).toHaveURL(at(`/dashboard/${STORE}`));
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
    await expect(page.getByText("Signed in as Manager (dev)")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Dashboard" });
    for (const [link, heading] of [
      ["Customers", "Customers"],
      ["Rewards", "Rewards"],
      ["Offers", "Offers"],
      ["Staff", "Staff"],
      ["Settings", "Settings"],
      ["Counter sign", "Counter sign"],
    ] as const) {
      await nav.getByRole("link", { name: link }).click();
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(nav.getByRole("link", { name: link })).toHaveAttribute("aria-current", "page");
    }

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/login`));
  });

  test("a cashier can't log in to the dashboard, nor walk in from the counter screen", async ({
    page,
  }) => {
    const code = tempCode();
    await createTempStaff(code, "counter password 9");

    await dashboardLogIn(page, code, "counter password 9");
    await expect(page.getByText("The dashboard is for managers.", { exact: false })).toBeVisible();

    await staffLogIn(page, code, "counter password 9");
    await expect(page.getByRole("heading", { name: "Add a visit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Owner dashboard" })).toHaveCount(0);
    await page.goto(`/dashboard/${STORE}`);
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/login?reason=managersOnly`));
  });

  test("managers get a link from the counter screen", async ({ page }) => {
    await staffLogIn(page, "0000", "0000");
    await page.getByRole("link", { name: "Owner dashboard" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  });
});

test.describe("customers (§11: masked, adjust with a note, release a number)", () => {
  test("find by the last digits, see masked details, adjust with a note", async ({ page }) => {
    const phone = testPhone();
    await earnAt(await testStoreId(), phone.e164);
    await openDashboard(page);

    await page.goto(`/dashboard/${STORE}/customers`);
    // All 10 digits: test numbers share "555" and only 10,000 endings, so 7 can collide.
    await page.getByLabel("Search customers").fill(phone.e164.slice(2));
    await page.getByRole("button", { name: "Search" }).click();
    const row = page.getByRole("row", { name: new RegExp(phone.e164.slice(-4)) });
    await expect(row).toContainText(`••• ${phone.e164.slice(-4)}`);
    await expect(page.locator("main")).not.toContainText(phone.e164.slice(2));
    await row.getByRole("link", { name: "Not signed up yet" }).click();

    await expect(page.getByTestId("customer-points")).toHaveText("5");
    await page.getByLabel("Points", { exact: true }).fill("10");
    await page.getByRole("button", { name: "Save adjustment" }).click();
    await expect(page.getByText(/Write a short note/)).toBeVisible();

    await page.getByLabel("Points", { exact: true }).fill("10");
    await page.getByLabel("Note").fill("Missed visit on Monday");
    await page.getByRole("button", { name: "Save adjustment" }).click();
    await expect(page.getByText("Done: +10 points. New balance: 15.")).toBeVisible();
    await expect(page.getByTestId("customer-points")).toHaveText("15");
    await expect(page.getByText("Adjusted: Missed visit on Monday")).toBeVisible();

    await page.getByLabel("Remove points").check();
    await page.getByLabel("Points", { exact: true }).fill("100");
    await page.getByLabel("Note").fill("Too many");
    await page.getByRole("button", { name: "Save adjustment" }).click();
    await expect(page.getByText("That would take the balance below zero.")).toBeVisible();
    await expect(page.getByTestId("customer-points")).toHaveText("15");
  });

  test("a signed-up customer's phone and email stay masked", async ({ page }) => {
    const customer = testCustomer();
    await signUp(page, customer);
    await page.context().clearCookies();
    await openDashboard(page);

    await page.goto(`/dashboard/${STORE}/customers?q=${customer.phone.e164.slice(-4)}`);
    await page.getByRole("link", { name: "Testa F." }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "Testa F." })).toBeVisible();
    const main = page.locator("main");
    await expect(main).toContainText(`${customer.email[0]}•••@example.test`);
    await expect(main).not.toContainText(customer.email);
    await expect(main).not.toContainText(customer.phone.e164.slice(2));
  });

  test("release a number: the account is closed, the number starts fresh", async ({ page }) => {
    const phone = testPhone();
    const storeId = await testStoreId();
    const customerId = await earnAt(storeId, phone.e164, 2);
    await openDashboard(page);
    await page.goto(`/dashboard/${STORE}/customers/${customerId}`);

    await page.locator("summary", { hasText: "Release this phone number" }).click();
    await page.getByRole("button", { name: "Release number" }).click();
    await expect(page.getByText("Write the reason (at least 3 characters).")).toBeVisible();
    await expect(page.getByText("Tick the box to confirm.")).toBeVisible();

    await page.getByLabel("Reason").fill("Cashier typed the wrong number");
    await page.getByLabel(/I understand this closes the account/).check();
    await page.getByRole("button", { name: "Release number" }).click();
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/customers?released=1`));
    await expect(page.getByText(/The number was released/)).toBeVisible();

    const { rows } = await db().query(
      `select status, phone_e164 from public.customers where id = $1`,
      [customerId],
    );
    expect(rows[0]).toEqual({ status: "deleted", phone_e164: null });
    const newId = await earnAt(storeId, phone.e164);
    expect(newId).not.toBe(customerId);
  });

  test("CSV export: masked, managers only", async ({ page }) => {
    const phone = testPhone();
    await earnAt(await testStoreId(), phone.e164);
    const url = `/api/dashboard/${STORE}/customers.csv`;
    expect((await page.request.get(url)).status()).toBe(401);

    await openDashboard(page);
    const response = await page.request.get(url);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toMatch(
      /suatu-test-customers-\d{4}-\d{2}-\d{2}\.csv/,
    );
    const csv = await response.text();
    expect(csv.split("\r\n")[0]).toBe(
      "First name,Last name,Phone,Email,Status,Joined,Last visit,Visits,Points,Offer emails",
    );
    expect(csv).toContain(`,,••• ${phone.e164.slice(-4)},,Not signed up yet,`);
    expect(csv).not.toContain(phone.e164.slice(2));
  });
});

test.describe("rewards, offers, settings (each test in a store of its own)", () => {
  test("rewards: add, edit, turn off, delete", async ({ page }) => {
    const store = await createScratchStore();
    await openDashboard(page, store.slug);
    await page.goto(`/dashboard/${store.slug}/rewards`);

    const add = page.getByRole("form", { name: "Add a reward" });
    await add.getByLabel("Name").fill("Car wash");
    await add.getByLabel("Cost in points").fill("abc");
    await add.getByRole("button", { name: "Add reward" }).click();
    await expect(add.getByText(/Enter the cost as a whole number/)).toBeVisible();
    await add.getByLabel("Cost in points").fill("150");
    await add.getByRole("button", { name: "Add reward" }).click();
    await expect(add.getByText("Reward added.")).toBeVisible();

    const carWash = page.getByRole("region", { name: "Car wash" });
    await expect(carWash).toContainText("150 points = 30 visits");
    const edit = carWash.getByRole("form", { name: "Edit Car wash" });
    await edit.getByLabel("Cost in points").fill("200");
    await edit.getByLabel(/On: customers can see/).uncheck();
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(carWash).toContainText("200 points = 40 visits");
    await expect(carWash).toContainText("· off");

    await carWash.locator("summary", { hasText: "Delete Car wash" }).click();
    await carWash.getByRole("button", { name: "Delete for good" }).click();
    await expect(page.getByRole("region", { name: "Car wash" })).toHaveCount(0);
  });

  test("offers: create with a picture and preview, customers see it, turn off, delete", async ({
    page,
    browser,
  }) => {
    const store = await createScratchStore();
    await openDashboard(page, store.slug);
    await page.goto(`/dashboard/${store.slug}/offers`);
    await expect(page.getByText(/No offers yet/)).toBeVisible();
    await page.getByRole("link", { name: "New offer" }).click();

    const preview = page.getByRole("region", { name: "Preview" });
    await page.getByLabel("Title").fill("2 hot dogs for $3");
    await expect(preview.getByRole("heading", { name: "2 hot dogs for $3" })).toBeVisible();
    await page.getByLabel("Details (optional)").fill("Any time, every day.");
    await page.getByLabel("Ends on (optional)").fill("2099-12-31");
    await expect(preview).toContainText("Until Dec 31");
    await page.getByLabel("Picture (optional)").setInputFiles({
      name: "green.png",
      mimeType: "image/png",
      buffer: greenPng(),
    });
    await expect(preview.locator("img")).toBeVisible();
    await page.getByRole("button", { name: "Create offer" }).click();
    await expect(page).toHaveURL(at(`/dashboard/${store.slug}/offers?saved=1`));
    await expect(page.getByRole("listitem").filter({ hasText: "2 hot dogs for $3" })).toContainText(
      "Showing now",
    );

    // A customer of this store sees it under their points, picture included.
    const customerContext = await newDevice(browser);
    const customerPage = await customerContext.newPage();
    await signUp(customerPage, testCustomer(), { store: store.slug });
    const offers = customerPage.getByRole("region", { name: "Offers" });
    await expect(offers.getByRole("heading", { name: "2 hot dogs for $3" })).toBeVisible();
    await expect(offers).toContainText("Until Dec 31");
    await expect
      .poll(() => offers.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);

    await page.getByRole("link", { name: "2 hot dogs for $3" }).click();
    await page.getByLabel("On: customers can see it").uncheck();
    await page.getByRole("button", { name: "Save offer" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "2 hot dogs for $3" })).toContainText(
      "Off",
    );
    await customerPage.reload();
    await expect(customerPage.getByRole("region", { name: "Offers" })).toHaveCount(0);

    await page.getByRole("link", { name: "2 hot dogs for $3" }).click();
    await page.locator("summary", { hasText: "Delete this offer" }).click();
    await page.getByRole("button", { name: "Delete for good" }).click();
    await expect(page.getByText("Offer deleted.")).toBeVisible();
    await expect(page.getByText(/No offers yet/)).toBeVisible();
    await customerContext.close();
  });

  test("offers: wrong file type and end before start are refused", async ({ page }) => {
    const store = await createScratchStore();
    await openDashboard(page, store.slug);
    await page.goto(`/dashboard/${store.slug}/offers/new`);
    await page.getByLabel("Title").fill("Bad dates");
    await page.getByLabel("Starts on (optional)").fill("2099-05-10");
    await page.getByLabel("Ends on (optional)").fill("2099-05-01");
    await page.getByLabel("Picture (optional)").setInputFiles({
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("<svg onload=alert(1)>"),
    });
    await page.getByRole("button", { name: "Create offer" }).click();
    await expect(page.getByText("The end date is before the start date.")).toBeVisible();

    await page.getByLabel("Ends on (optional)").fill("2099-05-20");
    await page.getByLabel("Picture (optional)").setInputFiles({
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("<svg onload=alert(1)>"),
    });
    await page.getByRole("button", { name: "Create offer" }).click();
    await expect(page.getByText("Use a JPG, PNG or WebP picture.")).toBeVisible();
  });

  test("settings: points per visit changes what the counter adds", async ({ page }) => {
    const store = await createScratchStore();
    await openDashboard(page, store.slug);
    await page.goto(`/dashboard/${store.slug}/settings`);
    await page.getByLabel("Points per visit").fill("0");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Enter a whole number from 1 to 100.")).toBeVisible();
    await page.getByLabel("Points per visit").fill("10");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Saved. Changes count from the next visit./)).toBeVisible();
    await expect(page.getByText("100 pts · 10 visits")).toBeVisible();

    await page.getByRole("link", { name: "Counter screen" }).click();
    await expect(page.getByRole("button", { name: "Add visit (+10)" })).toBeVisible();
  });
});

test.describe("staff management (§6: the owner never knows a working password)", () => {
  test("add a cashier; their first login asks for their own password", async ({ page }) => {
    const code = tempCode();
    await openDashboard(page);
    await page.goto(`/dashboard/${STORE}/staff`);
    const add = page.getByRole("region", { name: "Add a person" });
    await add.getByLabel("Name", { exact: true }).fill("Maria");
    await add.getByLabel("User name").fill("0000");
    await add.getByLabel("Temporary password").fill("short");
    await add.getByRole("button", { name: "Add person" }).click();
    await expect(add.getByText("Use at least 8 characters.")).toBeVisible();

    await add.getByLabel("Temporary password").fill("first shift 42");
    await add.getByRole("button", { name: "Add person" }).click();
    await expect(add.getByText("Someone at this store already has this user name.")).toBeVisible();

    await add.getByLabel("User name").fill(code);
    await add.getByLabel("Temporary password").fill("first shift 42");
    await add.getByRole("button", { name: "Add person" }).click();
    await expect(
      add.getByText(`Maria added. They log in as ${code} with the temporary password.`),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Maria" }).filter({ hasText: code }),
    ).toContainText("Waiting to choose their own password");

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(at(`/dashboard/${STORE}/login`));
    await staffLogIn(page, code, "first shift 42");
    await expect(page.getByText("This password is temporary.", { exact: false })).toBeVisible();
    await page.getByLabel("Temporary password").fill("first shift 42");
    await page.getByLabel("New password").fill("first shift 42");
    await page.getByRole("button", { name: "Save password and log in" }).click();
    await expect(
      page.getByText("Choose a password different from the temporary one."),
    ).toBeVisible();

    await page.getByLabel("Temporary password").fill("first shift 42");
    await page.getByLabel("New password").fill("maria at the pumps");
    await page.getByRole("button", { name: "Save password and log in" }).click();
    await expect(page.getByText("Signed in as Maria")).toBeVisible();

    // From now on, only her own password works.
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(at(`/staff/${STORE}/login`));
    await staffLogIn(page, code, "maria at the pumps");
    await expect(page.getByText("Signed in as Maria")).toBeVisible();
  });

  test("turn someone off and back on; reset their password", async ({ page, browser }) => {
    const code = tempCode();
    await createTempStaff(code, "counter password 8");
    const cashierContext = await newDevice(browser);
    const cashier = await cashierContext.newPage();
    await staffLogIn(cashier, code, "counter password 8");
    await expect(cashier.getByText("Signed in as Test cashier")).toBeVisible();

    await openDashboard(page);
    await page.goto(`/dashboard/${STORE}/staff`);
    await expect(
      page.getByRole("region", { name: "Manager (dev)" }).getByRole("button"),
    ).toHaveCount(0);
    const person = page.getByRole("region", { name: "Test cashier" }).filter({ hasText: code });
    await person.getByRole("button", { name: "Turn off Test cashier" }).click();
    await expect(person).toContainText("Turned off: can't log in.");

    // Their open counter screen is logged out at once.
    await cashier.reload();
    await expect(cashier).toHaveURL(at(`/staff/${STORE}/login`));
    await staffLogIn(cashier, code, "counter password 8");
    await expect(cashier.getByText("User name or password is incorrect.")).toBeVisible();

    await person.getByRole("button", { name: "Turn Test cashier back on" }).click();
    await person.locator("summary", { hasText: "Reset Test cashier's password" }).click();
    await person.getByLabel("Temporary password").fill("new temp pass 1");
    await person.getByRole("button", { name: "Set temporary password" }).click();
    await expect(person.getByText("Done. Give Test cashier the temporary password.")).toBeVisible();

    await staffLogIn(cashier, code, "counter password 8");
    await expect(cashier.getByText("User name or password is incorrect.")).toBeVisible();
    await staffLogIn(cashier, code, "new temp pass 1");
    await expect(cashier.getByText("This password is temporary.", { exact: false })).toBeVisible();
    await cashierContext.close();
  });
});

test("counter sign: QR code to sign-up and the notice (D5)", async ({ page }) => {
  await openDashboard(page);
  await page.goto(`/dashboard/${STORE}/sign`);
  const sign = page.getByRole("article", { name: "Counter sign" });
  await expect(sign.getByRole("heading", { name: "Join Suatu Rewards" })).toBeVisible();
  await expect(sign).toContainText("Free coffee after 20 visits");
  await expect(sign.getByRole("img", { name: /QR code to sign up/ }).locator("svg")).toBeVisible();
  await expect(sign).toContainText(new RegExp(`/s/${STORE}/signup`));
  await expect(sign).toContainText("Points have no cash value.");
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
});
