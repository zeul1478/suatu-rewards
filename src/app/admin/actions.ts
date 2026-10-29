"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, formDataObject, safeValues, type FormState } from "@/lib/forms";
import { requireAdmin } from "@/server/admin/access";
import { logInAdmin } from "@/server/admin/login";
import { endAdminSession } from "@/server/admin/session";
import { createStore, getStoreForAdmin, setStoreStatus } from "@/server/admin/stores";
import { POINTS_PER_VISIT_MAX } from "@/server/dashboard/settings";
import { addStaff, resetStaffPassword, setStaffActive } from "@/server/dashboard/staffAdmin";
import { clientIp } from "@/server/request";

/*
 * Platform admin actions (/admin, §11). Each one checks the admin session first; server actions
 * are POSTs with Next's origin check, so they're CSRF-safe (§8).
 */

const loginSchema = z.object({
  staffCode: z.string().trim().min(1, "staffCode.required"),
  password: z.string().min(1, "password.required"),
  newPassword: z.string().optional(),
});

/** Same form as the staff login (StaffLoginForm), including the "choose a new password" step. */
export async function adminLoginAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = safeValues(formData, ["staffCode"]);
  const parsed = loginSchema.safeParse(formDataObject(formData));
  const newPasswordStep = formData.has("newPassword");
  if (!parsed.success) {
    if (newPasswordStep) values.step = "newPassword";
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  if (newPasswordStep && !parsed.data.newPassword) {
    return {
      status: "error",
      fieldErrors: { newPassword: "newPassword.required" },
      values: { ...values, step: "newPassword" },
    };
  }

  const result = await logInAdmin({
    username: parsed.data.staffCode,
    password: parsed.data.password,
    newPassword: parsed.data.newPassword || undefined,
    ip: await clientIp(),
  });
  if (!result.ok) {
    if (result.error === "mustChangePassword") {
      return {
        status: "error",
        formError: "staffLogin.mustChangePassword",
        values: { ...values, step: "newPassword" },
      };
    }
    if (result.error === "newPasswordInvalid") {
      return {
        status: "error",
        fieldErrors: { newPassword: `newPassword.${result.issue}` },
        values: { ...values, step: "newPassword" },
      };
    }
    return {
      status: "error",
      formError: `staffLogin.${result.error}`,
      formErrorValues: "minutes" in result ? { minutes: result.minutes } : undefined,
      values,
    };
  }
  redirect("/admin");
}

export async function adminLogoutAction(reason?: "idle"): Promise<void> {
  await endAdminSession();
  redirect(reason === "idle" ? "/admin/login?reason=idle" : "/admin/login");
}

/* ───────────── stores ───────────── */

const newStoreSchema = z.object({
  name: z.string().trim().min(1, "storeName.required").max(60, "storeName.tooLong"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug.format")
    .min(3, "slug.format")
    .max(40, "slug.format")
    // Test runs create and delete these addresses (tests/support/testStore.ts).
    .refine((slug) => !slug.startsWith("test-") && slug !== "suatu-test", "slug.reserved"),
  timezone: z.string().min(1, "timezone.required"),
  pointsPerVisit: z.coerce
    .number({ message: "pointsPerVisit.invalid" })
    .int("pointsPerVisit.invalid")
    .min(1, "pointsPerVisit.invalid")
    .max(POINTS_PER_VISIT_MAX, "pointsPerVisit.invalid"),
  ownerName: z.string().trim().min(1, "displayName.required").max(40, "displayName.tooLong"),
  ownerCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,32}$/, "staffCode.format"),
  ownerPassword: z.string().min(1, "password.required"),
});

export async function createStoreAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const values = safeValues(formData, [
    "name",
    "slug",
    "timezone",
    "pointsPerVisit",
    "ownerName",
    "ownerCode",
  ]);
  const parsed = newStoreSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const result = await createStore(admin, parsed.data);
  if (!result.ok) {
    const fieldErrors: Record<string, string> =
      result.error === "passwordInvalid"
        ? { ownerPassword: `newPassword.${result.issue}` }
        : result.error === "slugTaken"
          ? { slug: "slug.taken" }
          : { timezone: "timezone.required" };
    return { status: "error", fieldErrors, values };
  }
  redirect(`/admin/stores/${result.storeId}?created=1`);
}

export async function setStoreStatusAction(
  storeId: string,
  status: "active" | "paused",
): Promise<FormState> {
  const admin = await requireAdmin();
  const changed = await setStoreStatus(admin, storeId, status);
  if (!changed) return { status: "error", formError: "admin.store.notFound" };
  refresh();
  return { status: "success" };
}

/* ───────────── a store's owners and staff ───────────── */

const addStaffSchema = z.object({
  displayName: z.string().trim().min(1, "displayName.required").max(40, "displayName.tooLong"),
  staffCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,32}$/, "staffCode.format"),
  role: z.enum(["cashier", "manager"], { message: "role.required" }),
  password: z.string().min(1, "password.required"),
});

async function loadStore(storeId: string) {
  const admin = await requireAdmin();
  const store = await getStoreForAdmin(storeId);
  return { admin, store, actor: { type: "admin" as const, id: admin.id } };
}

export async function adminAddStaffAction(
  storeId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, actor } = await loadStore(storeId);
  if (!store) return { status: "error", formError: "admin.store.notFound" };
  const values = safeValues(formData, ["displayName", "staffCode", "role"]);
  const parsed = addStaffSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const result = await addStaff(store, actor, parsed.data);
  if (!result.ok) {
    const fieldErrors: Record<string, string> =
      result.error === "codeTaken"
        ? { staffCode: "staffCode.taken" }
        : { password: `newPassword.${result.issue}` };
    return { status: "error", fieldErrors, values };
  }
  refresh();
  return {
    status: "success",
    formErrorValues: { name: parsed.data.displayName, code: parsed.data.staffCode },
  };
}

export async function adminSetStaffActiveAction(
  storeId: string,
  staffId: string,
  active: boolean,
): Promise<FormState> {
  const { store, actor } = await loadStore(storeId);
  if (!store) return { status: "error", formError: "admin.store.notFound" };
  const result = await setStaffActive(store, actor, staffId, active);
  if (!result.ok) return { status: "error", formError: `dashboard.staff.${result.error}` };
  refresh();
  return { status: "success" };
}

export async function adminResetStaffPasswordAction(
  storeId: string,
  staffId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, actor } = await loadStore(storeId);
  if (!store) return { status: "error", formError: "admin.store.notFound" };
  const password = String(formData.get("password") ?? "");
  if (!password) return { status: "error", fieldErrors: { password: "password.required" } };
  const result = await resetStaffPassword(store, actor, staffId, password);
  if (!result.ok) {
    return result.error === "passwordInvalid"
      ? { status: "error", fieldErrors: { password: `newPassword.${result.issue}` } }
      : { status: "error", formError: `dashboard.staff.${result.error}` };
  }
  refresh();
  return { status: "success" };
}
