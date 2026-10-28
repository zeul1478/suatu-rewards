"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fieldErrorsFrom, formDataObject, safeValues, type FormState } from "@/lib/forms";
import { storeUrl } from "@/lib/storeUrl";
import { clientIp } from "@/server/request";
import { logInStaff } from "@/server/staff/login";
import { endStaffSession } from "@/server/staff/session";
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
