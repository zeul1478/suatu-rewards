"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingLabel: string;
  size?: "regular" | "large";
  disabled?: boolean;
};

/** Primary glass button for a form; disabled while the form is submitting (no double submits). */
export function SubmitButton({
  children,
  pendingLabel,
  size = "regular",
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
      className={`glass glass-primary w-full ${size === "large" ? "glass-large" : ""}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
