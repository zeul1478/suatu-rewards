"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, formDataObject, safeValues, type FormState } from "@/lib/forms";
import { storeUrl } from "@/lib/storeUrl";
import { addVisit } from "@/server/points/addVisit";
import { voidEntry } from "@/server/points/recentEntries";
import { clientIp } from "@/server/request";
import { redeemCode } from "@/server/rewards/redemptions";
import { logInStaff } from "@/server/staff/login";
import { endStaffSession, getCurrentStaff } from "@/server/staff/session";
import { getStoreOr404 } from "@/server/stores/getStore";

const staffLoginSchema = z.object({
  staffCode: z.string().trim().min(1, "staffCode.required"),
  password: z.string().min(1, "password.required"),
});

export async function staffLoginAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const values = safeValues(formData, ["staffCode"]);
  const parsed = staffLoginSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const result = await logInStaff({
    storeId: store.id,
    staffCode: parsed.data.staffCode,
    password: parsed.data.password,
    ip: await clientIp(),
  });
  if (!result.ok) {
    return {
      status: "error",
      formError: `staffLogin.${result.error}`,
      formErrorValues: "minutes" in result ? { minutes: result.minutes } : undefined,
      values,
    };
  }
  redirect(storeUrl(store.slug, "", "staff"));
}

export async function staffLogoutAction(storeSlug: string, reason?: "idle"): Promise<void> {
  await endStaffSession();
  const login = storeUrl(storeSlug, "/login", "staff");
  redirect(reason === "idle" ? `${login}?reason=idle` : login);
}

/* ───────────── counter actions (§0 steps 4–10) ───────────── */

export type VisitBanner = {
  added: number;
  duplicate: boolean;
  isNewCustomer: boolean;
  customerName: string | null;
  phoneLast4: string;
  balance: number;
  targetCost: number | null;
  rewardName: string | null;
  unlocked: boolean;
  visitsToNext: number;
};

export type AddVisitState = {
  status: "idle" | "success" | "error";
  /** Idempotency key for the next submission; a fresh one after every success (§0). */
  nextKey: string;
  error?: string;
  /** What was typed, kept in the field after an error. */
  phone?: string;
  banner?: VisitBanner;
};

export async function addVisitAction(
  storeSlug: string,
  previous: AddVisitState,
  formData: FormData,
): Promise<AddVisitState> {
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (!staff) redirect(storeUrl(store.slug, "/login", "staff"));

  const phone = String(formData.get("phone") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!phone) return { status: "error", nextKey: previous.nextKey, error: "errors.phone.required" };
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    return { status: "error", nextKey: randomUUID(), error: "common.somethingWentWrong" };
  }

  const result = await addVisit({ store, staff, phone, idempotencyKey });
  if (!result.ok) {
    return {
      status: "error",
      nextKey: previous.nextKey,
      error: result.error === "phoneInvalid" ? "errors.phone.invalid" : "staff.dailyCapReached",
      phone,
    };
  }

  const { progress } = result;
  refresh(); // updates the recent-entries list
  return {
    status: "success",
    nextKey: randomUUID(),
    banner: {
      added: result.added,
      duplicate: result.duplicate,
      isNewCustomer: result.isNewCustomer,
      customerName: result.customerName,
      phoneLast4: result.phoneLast4,
      balance: progress.balance,
      targetCost: progress.target?.costPoints ?? null,
      rewardName: progress.target?.name ?? null,
      unlocked: progress.unlocked,
      visitsToNext: progress.visitsToNext,
    },
  };
}

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "staff.codeFormat");

export async function redeemCodeAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (!staff) redirect(storeUrl(store.slug, "/login", "staff"));

  const code = codeSchema.safeParse(formData.get("code") ?? "");
  if (!code.success) return { status: "error", formError: "staff.codeFormat" };

  const result = await redeemCode({ store, staff, code: code.data });
  if (!result.ok) {
    return {
      status: "error",
      formError: `staff.${result.error}`,
      formErrorValues: "minutes" in result ? { minutes: result.minutes } : undefined,
    };
  }
  return {
    status: "success",
    values: {
      rewardName: result.rewardName,
      phoneLast4: result.phoneLast4,
      balance: String(result.balance),
    },
  };
}

/** Void one of the cashier's own visits within 10 minutes (§6). */
export async function voidEntryAction(
  storeSlug: string,
  transactionId: string,
): Promise<FormState> {
  const store = await getStoreOr404(storeSlug);
  const staff = await getCurrentStaff(store.id);
  if (!staff) redirect(storeUrl(store.slug, "/login", "staff"));

  const result = await voidEntry({ store, staff, transactionId });
  if (!result.ok) return { status: "error", formError: `staff.void.${result.error}` };
  refresh();
  return { status: "success", formErrorValues: { points: result.points, balance: result.balance } };
}
