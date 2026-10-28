import { hash } from "@node-rs/argon2";
import pg from "pg";
import { env } from "./env";

/*
 * Direct database access for tests: set up states that are slow or impossible to reach through
 * the UI (a lock that has run out, an idle staff session, an expired reset link).
 */

let pool: pg.Pool | undefined;

export function db(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: env.databaseUrl, max: 4 });
  return pool;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

/** "Fake clock" for lockouts: move an existing lock into the past. */
export async function expireLock(scope: "customer_phone" | "staff_login" | "ip", key: string) {
  await db().query(
    `update public.auth_throttles set locked_until = now() - interval '1 second'
     where scope = $1 and key = $2`,
    [scope, key],
  );
}

export async function suatuStoreId(): Promise<string> {
  const { rows } = await db().query(`select id from public.stores where slug = 'suatu'`);
  return rows[0].id;
}

/** A throwaway cashier so lockout tests don't lock the shared 0000 account. */
export async function createTempStaff(code: string, password: string): Promise<void> {
  await db().query(
    `insert into public.staff (store_id, staff_code, role, display_name, password_hash)
     values ($1, $2, 'cashier', 'Test cashier', $3)`,
    [await suatuStoreId(), code, await hash(password)],
  );
}

/** Pretend the staff member has been idle for `minutes`. */
export async function ageStaffSessions(staffCode: string, minutes: number): Promise<void> {
  await db().query(
    `update public.staff_sessions set last_seen_at = now() - make_interval(mins => $2)
     where staff_id in (select id from public.staff where staff_code = $1) and revoked_at is null`,
    [staffCode, minutes],
  );
}

/** Pretend a password-reset email was sent `minutes` ago (Supabase checks recovery_sent_at). */
export async function ageRecoveryEmail(email: string, minutes: number): Promise<void> {
  await db().query(
    `update auth.users set recovery_sent_at = now() - make_interval(mins => $2) where email = $1`,
    [email, minutes],
  );
}

/** Customer created by a staff entry, before any sign-up (§0 step 10). */
export async function createUnclaimedCustomer(phoneE164: string): Promise<string> {
  const { rows } = await db().query(
    `insert into public.customers (status, phone_e164) values ('unclaimed', $1) returning id`,
    [phoneE164],
  );
  return rows[0].id;
}

export async function customerByPhone(phoneE164: string) {
  const { rows } = await db().query(
    `select id, status, auth_user_id, email, first_name from public.customers where phone_e164 = $1`,
    [phoneE164],
  );
  return rows[0] as
    | {
        id: string;
        status: string;
        auth_user_id: string | null;
        email: string | null;
        first_name: string | null;
      }
    | undefined;
}
