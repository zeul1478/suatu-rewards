"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/FormAlert";
import { Icon } from "@/components/ui/icons/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type DeleteButtonProps = {
  action: () => Promise<FormState>;
  /** "Delete Free coffee": what the disclosure says. */
  label: string;
  explain: string;
  confirmLabel: string;
  pendingLabel: string;
};

/** A delete that takes two taps: open, then confirm. No browser dialogs. */
export function DeleteButton({
  action,
  label,
  explain,
  confirmLabel,
  pendingLabel,
}: DeleteButtonProps) {
  const [state, formAction] = useActionState(action, idleForm);
  const text = useFormText(state);

  return (
    <details className="group">
      <summary className="flex min-h-[var(--target-min)] w-fit cursor-pointer list-none items-center gap-2 font-semibold text-danger">
        <Icon name="trash" size={20} />
        {label}
      </summary>
      <form suppressHydrationWarning action={formAction} className="mt-2 flex flex-col gap-3">
        <p className="text-sm">{explain}</p>
        {text.formError ? <FormAlert tone="error">{text.formError}</FormAlert> : null}
        <SubmitButton variant="danger" icon="trash" pendingLabel={pendingLabel}>
          {confirmLabel}
        </SubmitButton>
      </form>
    </details>
  );
}
