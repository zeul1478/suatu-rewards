"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Icon } from "@/components/ui/icons/Icon";
import { useFormText } from "@/components/ui/useFormText";
import { idleForm, type FormState } from "@/lib/forms";

type VoidButtonProps = {
  action: () => Promise<FormState>;
  /** Seconds left in the 10-minute window; the button hides itself when it runs out. */
  voidableForSeconds: number;
  label: string;
};

/** Void for one recent entry. The server enforces the rules; this just hides when it's too late. */
export function VoidButton({ action, voidableForSeconds, label }: VoidButtonProps) {
  const t = useTranslations("staff.void");
  const [state, formAction, pending] = useActionState(action, idleForm);
  const text = useFormText(state);
  const [open, setOpen] = useState(voidableForSeconds > 0);

  useEffect(() => {
    if (voidableForSeconds <= 0) return;
    const timer = window.setTimeout(() => setOpen(false), voidableForSeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [voidableForSeconds]);

  if (state.status === "error") {
    return (
      <p role="alert" className="max-w-48 text-right text-sm font-semibold text-danger">
        {text.formError}
      </p>
    );
  }
  if (!open) return null;
  return (
    <form suppressHydrationWarning action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        className="glass min-h-[var(--target-min)] px-3 text-sm"
      >
        <Icon name="undo" size={20} />
        {pending ? t("voiding") : t("button")}
      </button>
    </form>
  );
}
