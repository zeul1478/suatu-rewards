"use server";

import { randomUUID } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, formDataObject, safeValues, type FormState } from "@/lib/forms";
import { storeUrl } from "@/lib/storeUrl";
import { requireManager } from "@/server/dashboard/access";
import { adjustPoints, releaseNumber } from "@/server/dashboard/customers";
import { createReward, deleteReward, updateReward } from "@/server/dashboard/rewards";
import { POINTS_PER_VISIT_MAX, updatePointsPerVisit } from "@/server/dashboard/settings";
import { addStaff, resetStaffPassword, setStaffActive } from "@/server/dashboard/staffAdmin";
import {
  deleteOffer,
  detectImageType,
  OFFER_IMAGE_MAX_BYTES,
  saveOffer,
  type OfferInput,
} from "@/server/offers/offers";
import { endStaffSession } from "@/server/staff/session";

/*
 * Owner dashboard actions (§11). Each one checks the manager session first (requireManager);
 * server actions are POSTs with Next's origin check, so they're CSRF-safe (§8).
 */

export async function dashboardLogoutAction(storeSlug: string, reason?: "idle"): Promise<void> {
  await endStaffSession();
  const login = storeUrl(storeSlug, "/login", "dashboard");
  redirect(reason === "idle" ? `${login}?reason=idle` : login);
}

const checkbox = z
  .string()
  .optional()
  .transform((value) => value === "on");

/* ───────────── customers ───────────── */

const adjustSchema = z.object({
  direction: z.enum(["add", "remove"], { message: "direction.required" }),
  points: z.coerce
    .number({ message: "points.invalid" })
    .int("points.invalid")
    .min(1, "points.invalid")
    .max(10_000, "points.invalid"),
  note: z.string().trim().min(3, "note.required").max(200, "note.tooLong"),
  idempotencyKey: z.uuid(),
});

export async function adjustPointsAction(
  storeSlug: string,
  customerId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["direction", "points", "note", "idempotencyKey"]);
  const parsed = adjustSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const { direction, points, note, idempotencyKey } = parsed.data;
  const result = await adjustPoints({
    store,
    manager,
    customerId,
    points: direction === "add" ? points : -points,
    note,
    idempotencyKey,
  });
  if (!result.ok) {
    return { status: "error", formError: `dashboard.adjust.${result.error}`, values };
  }
  refresh();
  return {
    status: "success",
    formErrorValues: {
      points: result.points > 0 ? `+${result.points}` : `−${Math.abs(result.points)}`,
      balance: result.balance,
    },
    // A fresh key: the next adjustment is a new one, not a retry of this one.
    values: { idempotencyKey: randomUUID() },
  };
}

const releaseSchema = z.object({
  reason: z.string().trim().min(3, "reason.required").max(200, "reason.tooLong"),
  confirm: z.literal("on", { message: "confirm.required" }),
});

export async function releaseNumberAction(
  storeSlug: string,
  customerId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["reason"]);
  const parsed = releaseSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const result = await releaseNumber({ store, manager, customerId, reason: parsed.data.reason });
  if (!result.ok) return { status: "error", formError: "dashboard.customers.notFound", values };
  redirect(`${storeUrl(store.slug, "/customers", "dashboard")}?released=1`);
}

/* ───────────── rewards ───────────── */

const rewardSchema = z.object({
  name: z.string().trim().min(1, "rewardName.required").max(60, "rewardName.tooLong"),
  costPoints: z.coerce
    .number({ message: "costPoints.invalid" })
    .int("costPoints.invalid")
    .min(1, "costPoints.invalid")
    .max(100_000, "costPoints.invalid"),
  active: checkbox,
});

export async function saveRewardAction(
  storeSlug: string,
  rewardId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["name", "costPoints", "active"]);
  const parsed = rewardSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  if (rewardId) {
    const found = await updateReward(store, manager, rewardId, parsed.data);
    if (!found) return { status: "error", formError: "dashboard.rewards.notFound", values };
  } else {
    await createReward(store, manager, parsed.data);
  }
  refresh();
  return { status: "success", values: rewardId ? values : {} };
}

export async function deleteRewardAction(storeSlug: string, rewardId: string): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const result = await deleteReward(store, manager, rewardId);
  if (!result.ok) return { status: "error", formError: `dashboard.rewards.${result.error}` };
  refresh();
  return { status: "success" };
}

/* ───────────── offers ───────────── */

const date = z
  .string()
  .optional()
  .transform((value) => value || null)
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "date.invalid");

const offerSchema = z
  .object({
    title: z.string().trim().min(1, "offerTitle.required").max(60, "offerTitle.tooLong"),
    body: z
      .string()
      .trim()
      .max(200, "offerBody.tooLong")
      .optional()
      .transform((value) => value || null),
    startsOn: date,
    endsOn: date,
    active: checkbox,
    removeImage: checkbox,
  })
  .refine((offer) => !offer.startsOn || !offer.endsOn || offer.endsOn >= offer.startsOn, {
    path: ["endsOn"],
    message: "endsOn.beforeStart",
  });

export async function saveOfferAction(
  storeSlug: string,
  offerId: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["title", "body", "startsOn", "endsOn", "active"]);
  const parsed = offerSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  let image: OfferInput["image"] = parsed.data.removeImage ? "remove" : undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > OFFER_IMAGE_MAX_BYTES) {
      return { status: "error", fieldErrors: { image: "image.tooBig" }, values };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type) return { status: "error", fieldErrors: { image: "image.invalid" }, values };
    image = { bytes, type };
  }

  const { title, body, startsOn, endsOn, active } = parsed.data;
  const saved = await saveOffer(store, manager, offerId, {
    title,
    body,
    startsOn,
    endsOn,
    active,
    image,
  });
  if (!saved) return { status: "error", formError: "dashboard.offers.notFound", values };
  redirect(`${storeUrl(store.slug, "/offers", "dashboard")}?saved=1`);
}

export async function deleteOfferAction(storeSlug: string, offerId: string): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const deleted = await deleteOffer(store, manager, offerId);
  if (!deleted) return { status: "error", formError: "dashboard.offers.notFound" };
  redirect(`${storeUrl(store.slug, "/offers", "dashboard")}?deleted=1`);
}

/* ───────────── staff ───────────── */

const addStaffSchema = z.object({
  displayName: z.string().trim().min(1, "displayName.required").max(40, "displayName.tooLong"),
  staffCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{4,32}$/, "staffCode.format"),
  role: z.enum(["cashier", "manager"], { message: "role.required" }),
  password: z.string().min(1, "password.required"),
});

export async function addStaffAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["displayName", "staffCode", "role"]);
  const parsed = addStaffSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const result = await addStaff(store, manager, parsed.data);
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

export async function setStaffActiveAction(
  storeSlug: string,
  staffId: string,
  active: boolean,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const result = await setStaffActive(store, manager, staffId, active);
  if (!result.ok) return { status: "error", formError: `dashboard.staff.${result.error}` };
  refresh();
  return { status: "success" };
}

export async function resetStaffPasswordAction(
  storeSlug: string,
  staffId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const password = String(formData.get("password") ?? "");
  if (!password) return { status: "error", fieldErrors: { password: "password.required" } };
  const result = await resetStaffPassword(store, manager, staffId, password);
  if (!result.ok) {
    return result.error === "passwordInvalid"
      ? { status: "error", fieldErrors: { password: `newPassword.${result.issue}` } }
      : { status: "error", formError: `dashboard.staff.${result.error}` };
  }
  refresh();
  return { status: "success" };
}

/* ───────────── settings ───────────── */

const settingsSchema = z.object({
  pointsPerVisit: z.coerce
    .number({ message: "pointsPerVisit.invalid" })
    .int("pointsPerVisit.invalid")
    .min(1, "pointsPerVisit.invalid")
    .max(POINTS_PER_VISIT_MAX, "pointsPerVisit.invalid"),
});

export async function saveSettingsAction(
  storeSlug: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { store, manager } = await requireManager(storeSlug);
  const values = safeValues(formData, ["pointsPerVisit"]);
  const parsed = settingsSchema.safeParse(formDataObject(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  await updatePointsPerVisit(store, manager, parsed.data.pointsPerVisit);
  refresh();
  return { status: "success", values };
}
