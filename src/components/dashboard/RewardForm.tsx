"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormAlert } from "@/components/ui/FormAlert";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { useFocusFirstError } from "@/components/ui/useFocusFirstError";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type RewardFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** Present when editing; a new reward starts empty and on. */
  reward?: { id: string; name: string; costPoints: number; active: boolean };
};

/** Name, cost in points, on/off. Field ids are per reward so several forms fit on one page. */
export function RewardForm({ action, reward }: RewardFormProps) {
  const t = useTranslations("dashboard.rewards");
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);
  const formRef = useFocusFirstError(state.status, state);
  const values = state.status === "error" ? state.values : undefined;
  const prefix = reward ? `reward-${reward.id.slice(0, 8)}` : "new-reward";

  return (
    <form
      suppressHydrationWarning
      ref={formRef}
      action={formAction}
      noValidate
      aria-label={reward ? t("editLabel", { name: reward.name }) : t("addTitle")}
      className="flex flex-col gap-4"
    >
      {state.status === "success" ? (
        <FormAlert tone="success">{reward ? t("saved") : t("added")}</FormAlert>
      ) : null}
      {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <TextField
          idPrefix={prefix}
          name="name"
          label={t("name")}
          error={text.fieldError("name")}
          maxLength={60}
          autoComplete="off"
          required
          defaultValue={values?.name ?? reward?.name}
        />
        <TextField
          idPrefix={prefix}
          name="costPoints"
          label={t("cost")}
          error={text.fieldError("costPoints")}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          required
          defaultValue={values?.costPoints ?? reward?.costPoints}
        />
      </div>
      <Checkbox
        idPrefix={prefix}
        name="active"
        defaultChecked={values ? values.active === "on" : (reward?.active ?? true)}
      >
        {t("active")}
      </Checkbox>
      <SubmitButton pendingLabel={t("saving")}>{reward ? t("save") : t("add")}</SubmitButton>
    </form>
  );
}
