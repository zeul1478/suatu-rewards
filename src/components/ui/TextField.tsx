import type { InputHTMLAttributes, Ref } from "react";
import { RequiredMark } from "./RequiredMark";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  /** Larger input for the staff screen. */
  variant?: "regular" | "large";
  ref?: Ref<HTMLInputElement>;
};

/** Labelled input with hint and error wired to aria-describedby. Required fields show "*". */
export function TextField({
  name,
  label,
  hint,
  error,
  required,
  variant = "regular",
  className = "",
  ref,
  ...inputProps
}: TextFieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-0.5">
        <label htmlFor={id} className="font-semibold text-ink">
          {label}
        </label>
        {required ? <RequiredMark /> : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      <input
        ref={ref}
        id={id}
        name={name}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`field-input ${variant === "large" ? "field-input-large" : ""} ${className}`}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
