"use client";

import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "./icons/Icon";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  size?: "regular" | "large";
  disabled?: boolean;
  icon?: IconName;
  /** Secondary (quieter) glass instead of the primary green. */
  variant?: "primary" | "secondary";
};

/** Primary glass button for a form; disabled while the form is submitting (no double submits). */
export function SubmitButton({
  children,
  pendingLabel,
  size = "regular",
  disabled,
  icon,
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={`glass w-full ${variant === "primary" ? "glass-primary" : ""} ${size === "large" ? "glass-large" : ""}`}
    >
      {icon ? <Icon name={icon} size={size === "large" ? 28 : 24} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
