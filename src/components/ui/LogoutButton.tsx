"use client";

import { SubmitButton } from "./SubmitButton";

type LogoutButtonProps = {
  action: () => Promise<void>;
  label: string;
  pendingLabel: string;
};

/** A form, not a link: logging out changes state, so it's a POST (and CSRF-checked). */
export function LogoutButton({ action, label, pendingLabel }: LogoutButtonProps) {
  return (
    <form action={action}>
      <SubmitButton pendingLabel={pendingLabel}>{label}</SubmitButton>
    </form>
  );
}
