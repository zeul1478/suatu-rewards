import { RequiredMark } from "./RequiredMark";
import type { ReactNode } from "react";
import { FieldError } from "./FieldError";

type CheckboxProps = {
  name: string;
  /** See TextField. */
  idPrefix?: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  defaultChecked?: boolean;
  /** Controlled use (the form keeps the value, so React's reset after a submit can't clear it). */
  checked?: boolean;
  onChange?: (checked: boolean) => void;
};

/** Native checkbox with a 44px tap row. Starts unchecked unless told otherwise. */
export function Checkbox({
  name,
  idPrefix = "field",
  children,
  error,
  required,
  defaultChecked,
  checked,
  onChange,
}: CheckboxProps) {
  const id = `${idPrefix}-${name}`;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-[var(--target-min)] items-start gap-3 py-1">
        <input
          suppressHydrationWarning
          id={id}
          name={name}
          type="checkbox"
          required={required}
          defaultChecked={checked === undefined ? defaultChecked : undefined}
          checked={checked}
          onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="checkbox-input mt-0.5"
        />
        <label htmlFor={id} className="text-ink">
          {children}
        </label>
        {required ? <RequiredMark /> : null}
      </div>
      <FieldError id={errorId ?? ""} message={error} className="pl-9" />
    </div>
  );
}
