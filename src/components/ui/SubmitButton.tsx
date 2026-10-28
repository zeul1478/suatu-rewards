"use client";

import { useFormStatus } from "react-dom";
import { Icon, type IconName } from "./icons/Icon";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  size?: "regular" | "large";
  disabled?: boolean;
  icon?: IconName;
  /** primary: brand glass · secondary: quieter glass · danger: destructive, red. */
  variant?: "primary" | "secondary" | "danger";
};

const variantClass = { primary: "glass-primary", secondary: "", danger: "glass-danger" } as const;

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
      className={`glass w-full ${variantClass[variant]} ${size === "large" ? "glass-large" : ""}`}
    >
      {icon ? <Icon name={icon} size={size === "large" ? 28 : 24} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
