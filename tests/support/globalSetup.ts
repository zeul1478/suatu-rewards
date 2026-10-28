import { closeDb } from "./db";
import { env } from "./env";
import { cleanUpTestData, createTestStore } from "./testStore";

/*
 * Wraps every test run (Playwright and Vitest): create the tests' own store first, delete
 * everything tests created afterwards — so the real store's data and the Mailpit inbox only
 * ever contain what people did by hand.
 */

export async function setup(): Promise<void> {
  await createTestStore();
  await closeDb();
}

export async function teardown(): Promise<void> {
  await cleanUpTestData();
  await closeDb();
  // Every test email goes to …@example.test.
  await fetch(`${env.mailpitUrl}/api/v1/search?query=${encodeURIComponent("to:example.test")}`, {
    method: "DELETE",
  });
}

/** Playwright's globalSetup form: returning a function makes it the teardown. */
export default async function playwrightGlobalSetup(): Promise<() => Promise<void>> {
  await setup();
  return teardown;
}
