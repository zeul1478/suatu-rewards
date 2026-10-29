import "server-only";
import { hash } from "@node-rs/argon2";
import { recordAudit } from "@/server/audit";
import { checkNewStaffPassword, type StaffPasswordIssue } from "@/server/staff/passwordPolicy";
import type { StaffMember } from "@/server/staff/session";
import type { Store } from "@/server/stores/getStore";
import { supabaseAdmin } from "@/server/supabase/admin";
import { isUuid } from "./customers";

/*
 * Staff management (§6): the owner adds people, turns them off, and resets passwords. Every
 * password the owner types is temporary: the person must choose their own at the next login
 * (must_change_password), so the owner never knows a working password.
 */

export type StaffRow = {
  id: string;
  staffCode: string;
  displayName: string;
  role: "cashier" | "manager";
  active: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  isYou: boolean;
};

export async function listStaff(store: Store, manager: StaffMember): Promise<StaffRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("staff")
    .select("id, staff_code, display_name, role, active, must_change_password, last_login_at")
    .eq("store_id", store.id)
    .order("active", { ascending: false })
    .order("display_name");
  if (error) throw new Error(`Staff lookup failed: ${error.message}`);
  const format = new Intl.DateTimeFormat(store.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: store.timezone,
  });
  return data.map((row) => ({
    id: row.id,
    staffCode: row.staff_code,
    displayName: row.display_name,
    role: row.role as StaffRow["role"],
    active: row.active,
    mustChangePassword: row.must_change_password,
    lastLogin: row.last_login_at ? format.format(new Date(row.last_login_at)) : null,
    isYou: row.id === manager.id,
  }));
}

export type AddStaffResult =
  | { ok: true }
  | { ok: false; error: "codeTaken" }
  | { ok: false; error: "passwordInvalid"; issue: StaffPasswordIssue };

export async function addStaff(
  store: Store,
  manager: StaffMember,
  input: { staffCode: string; displayName: string; role: StaffRow["role"]; password: string },
): Promise<AddStaffResult> {
  const issue = checkNewStaffPassword(input.password, { staffCode: input.staffCode });
  if (issue) return { ok: false, error: "passwordInvalid", issue };

  const { data, error } = await supabaseAdmin()
    .from("staff")
    .insert({
      store_id: store.id,
      staff_code: input.staffCode,
      display_name: input.displayName,
      role: input.role,
      password_hash: await hash(input.password),
      must_change_password: true,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, error: "codeTaken" };
  if (error) throw new Error(`Staff insert failed: ${error.message}`);
  await audit(store, manager, "staff.added", data.id, { role: input.role });
  return { ok: true };
}

export type StaffChangeResult =
  | { ok: true }
  | { ok: false; error: "notFound" | "notYourself" }
  | { ok: false; error: "passwordInvalid"; issue: StaffPasswordIssue };

/** Turn someone off (or back on). Turning off ends their sessions at once. */
export async function setStaffActive(
  store: Store,
  manager: StaffMember,
  staffId: string,
  active: boolean,
): Promise<StaffChangeResult> {
  if (staffId === manager.id) return { ok: false, error: "notYourself" };
  const changed = await updateStaff(store, staffId, { active });
  if (!changed) return { ok: false, error: "notFound" };
  if (!active) await endSessions(staffId);
  await audit(store, manager, active ? "staff.enabled" : "staff.disabled", staffId);
  return { ok: true };
}

/** New temporary password; their sessions end and the next login asks for a new password. */
export async function resetStaffPassword(
  store: Store,
  manager: StaffMember,
  staffId: string,
  password: string,
): Promise<StaffChangeResult> {
  if (staffId === manager.id) return { ok: false, error: "notYourself" };
  if (!isUuid(staffId)) return { ok: false, error: "notFound" };
  const { data: staff } = await supabaseAdmin()
    .from("staff")
    .select("staff_code")
    .eq("store_id", store.id)
    .eq("id", staffId)
    .maybeSingle();
  if (!staff) return { ok: false, error: "notFound" };

  const issue = checkNewStaffPassword(password, { staffCode: staff.staff_code });
  if (issue) return { ok: false, error: "passwordInvalid", issue };

  await updateStaff(store, staffId, {
    password_hash: await hash(password),
    must_change_password: true,
  });
  await endSessions(staffId);
  await supabaseAdmin()
    .from("auth_throttles")
    .delete()
    .eq("scope", "staff_login")
    .eq("key", `${store.id}:${staff.staff_code.toLowerCase()}`);
  await audit(store, manager, "staff.password_reset", staffId);
  return { ok: true };
}

async function updateStaff(
  store: Store,
  staffId: string,
  values: { active?: boolean; password_hash?: string; must_change_password?: boolean },
): Promise<boolean> {
  if (!isUuid(staffId)) return false;
  const { data, error } = await supabaseAdmin()
    .from("staff")
    .update(values)
    .eq("store_id", store.id)
    .eq("id", staffId)
    .select("id");
  if (error) throw new Error(`Staff update failed: ${error.message}`);
  return data.length > 0;
}

async function endSessions(staffId: string) {
  const { error } = await supabaseAdmin()
    .from("staff_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("staff_id", staffId)
    .is("revoked_at", null);
  if (error) throw new Error(`Staff session revoke failed: ${error.message}`);
}

function audit(
  store: Store,
  manager: StaffMember,
  action: string,
  staffId: string,
  details: Record<string, string> = {},
) {
  return recordAudit({
    storeId: store.id,
    actorType: "staff",
    actorId: manager.id,
    action,
    targetType: "staff",
    targetId: staffId,
    details,
  });
}
