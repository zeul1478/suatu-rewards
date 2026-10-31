import type { InputHTMLAttributes, Ref } from "react";
import { RequiredMark } from "./RequiredMark";
import { FieldError } from "./FieldError";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  name: string;
  label: string;
  /** For several forms with the same fields on one page: ids become `<idPrefix>-<name>`. */
  idPrefix?: string;
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
  idPrefix = "field",
  hint,
  error,
  required,
  variant = "regular",
  className = "",
  ref,
  ...inputProps
}: TextFieldProps) {
  const id = `${idPrefix}-${name}`;
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
        // Chrome on iOS adds autofill attributes (__gcruniqueid) to inputs and forms before
        // React loads; ignore attribute differences on this element only. Same on every form.
        suppressHydrationWarning
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
      <FieldError id={errorId ?? ""} message={error} />
    </div>
  );
}
