// `pnpm db:seed-demo` (also run by db:start / db:reset) — adds the fictional demo customer shown
// on the dev home. Needs Supabase Auth, so it can't live in seed.sql. Safe to run twice.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const DEMO_CUSTOMER = {
  phone: "+19545550142",
  firstName: "Andrei",
  lastName: "Popescu",
  email: "andrei.demo@example.test",
  password: "suatu demo coffee",
};

/** Must match src/lib/password/authSecret.ts (a unit test checks they agree). */
export function toAuthSecret(password) {
  return createHash("sha256").update(password.normalize("NFC"), "utf8").digest("base64url");
}

function legalVersion(file) {
  const match = /^version:\s*(.+)$/m.exec(readFileSync(`legal/${file}`, "utf8"));
  if (!match) throw new Error(`No version in legal/${file}`);
  return match[1].trim();
}

async function main() {
  process.loadEnvFile(".env.local");
  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await admin
    .from("customers")
    .select("id")
    .eq("phone_e164", DEMO_CUSTOMER.phone)
    .maybeSingle();
  if (existing) {
    console.log("Demo customer already exists");
    return;
  }

  const { data: store } = await admin.from("stores").select("id").eq("slug", "suatu").single();
  const { data: created, error } = await admin.auth.admin.createUser({
    phone: DEMO_CUSTOMER.phone,
    password: toAuthSecret(DEMO_CUSTOMER.password),
    phone_confirm: true,
    email: DEMO_CUSTOMER.email,
    email_confirm: true,
  });
  if (error) throw error;

  const { data: customerId, error: registerError } = await admin.rpc("register_customer", {
    p_auth_user_id: created.user.id,
    p_store_id: store.id,
    p_phone_e164: DEMO_CUSTOMER.phone,
    p_email: DEMO_CUSTOMER.email,
    p_first_name: DEMO_CUSTOMER.firstName,
    p_last_name: DEMO_CUSTOMER.lastName,
    p_program_terms_version: legalVersion("suatu-program-terms.md"),
    p_privacy_version: legalVersion("app-privacy-policy.md"),
    p_terms_of_use_version: legalVersion("app-terms-of-use.md"),
    p_marketing_email: false,
    p_source: "dev_seed",
  });
  if (registerError) throw registerError;
  await admin
    .from("customers")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", customerId);
  console.log("Added demo customer Andrei Popescu, (954) 555-0142");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
