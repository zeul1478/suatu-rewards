// `pnpm admin:create <user-name> "<Display name>"` — adds a platform admin (/admin) with a
// temporary password, printed once. They choose their own at the first login (DECISIONS D64).
// Uses DATABASE_URL: .env.local locally; for production pass the hosted database's URL:
//   DATABASE_URL="postgresql://…" pnpm admin:create maria "Maria Ionescu"
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { hash } from "@node-rs/argon2";
import pg from "pg";

const [username, displayName] = process.argv.slice(2);
if (!username || !displayName) {
  console.error('Usage: pnpm admin:create <user-name> "<Display name>"');
  process.exit(1);
}
if (!/^[A-Za-z0-9]{4,32}$/.test(username)) {
  console.error("The user name must be 4 to 32 letters or numbers.");
  process.exit(1);
}
if (username === "0000") {
  console.error("0000 is the development login; choose a real user name.");
  process.exit(1);
}

if (!process.env.DATABASE_URL && existsSync(".env.local")) process.loadEnvFile(".env.local");
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

// 16 characters from 96 random bits: meets the password rules, never a common password.
const temporaryPassword = randomBytes(12).toString("base64url");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(
    `insert into public.platform_admins (username, display_name, password_hash, must_change_password)
     values ($1, $2, $3, true)`,
    [username, displayName, await hash(temporaryPassword)],
  );
  console.log(`\n  Admin "${displayName}" added. Log in at /admin with:`);
  console.log(`    user name           ${username}`);
  console.log(`    temporary password  ${temporaryPassword}`);
  console.log("  Shown only now. They choose their own password at the first login.\n");
} catch (error) {
  if (error.code === "23505") {
    console.error(`An admin with the user name "${username}" already exists.`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await client.end();
}
