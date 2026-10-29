import { describe, expect, it } from "vitest";
import { findSecrets } from "../../scripts/check-secrets.mjs";

/*
 * The commit-time and CI key scanner. Fake keys are built at run time, so this file doesn't
 * contain anything the scanner would refuse.
 */

const fake = (prefix: string, length = 40) => prefix + "a1B2c3D4".repeat(8).slice(0, length);
const jwt = (claims: object) =>
  [{ alg: "HS256", typ: "JWT" }, claims]
    .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
    .join(".") + ".c2lnbmF0dXJlLXNpZ25hdHVyZQ";

describe("findSecrets", () => {
  it.each([
    ["Supabase secret key", `SUPABASE_SECRET_KEY=${fake("sb_" + "secret_")}`],
    ["private key", `-----BEGIN ${"PRIVATE"} KEY-----`],
    ["GitHub token", `token: ${fake("gh" + "p_", 36)}`],
    ["Stripe live key", fake("sk_" + "live_", 24)],
    ["AWS access key", "AK" + "IAABCDEFGHIJKLMNOP"],
    ["Resend API key", `${fake("re" + "_", 10)}_${fake("", 24)}`],
    [
      "database URL with a password",
      "postgresql://postgres:" + "hunter2" + "@db.abcd.supabase.co:5432/postgres",
    ],
  ])("catches a %s", (_, line) => {
    expect(findSecrets("src/config.ts", `const x = 1;\n${line}\n`)).not.toEqual([]);
  });

  it("catches a Supabase service_role key, not the public anon one", () => {
    expect(findSecrets("a.ts", jwt({ role: "service_role" }))).toHaveLength(1);
    expect(findSecrets("a.ts", jwt({ role: "anon" }))).toEqual([]);
  });

  it("refuses key files by name", () => {
    for (const path of [
      ".env.local",
      ".env",
      "app/.env.production",
      "certs/dev-key.pem",
      "id_rsa",
    ]) {
      expect(findSecrets(path, ""), path).not.toEqual([]);
    }
  });

  it("allows the template, local database URLs and ordinary code", () => {
    expect(findSecrets(".env.example", "SUPABASE_SECRET_KEY=\n")).toEqual([]);
    expect(
      findSecrets("tests/env.ts", "postgresql://postgres:postgres@127.0.0.1:55322/postgres"),
    ).toEqual([]);
    expect(findSecrets("src/a.ts", "const secret = process.env.SUPABASE_SECRET_KEY;")).toEqual([]);
  });
});
