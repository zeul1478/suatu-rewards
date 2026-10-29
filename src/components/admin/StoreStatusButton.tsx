"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

/** Pause a store (its app, counter screen and dashboard go offline) or switch it back on. */
export function StoreStatusButton({
  action,
  pause,
  name,
}: {
  action: () => Promise<FormState>;
  pause: boolean;
  name: string;
}) {
  const t = useTranslations("admin.store");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  return (
    <form suppressHydrationWarning action={formAction} className="flex flex-col gap-2">
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
      <SubmitButton
        variant={pause ? "danger" : "secondary"}
        icon={pause ? "lock" : "check"}
        pendingLabel={t("saving")}
      >
        {pause ? t("pause", { name }) : t("resume", { name })}
      </SubmitButton>
    </form>
  );
}
