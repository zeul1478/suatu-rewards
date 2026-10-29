import { RequiredMark } from "./RequiredMark";
import type { ReactNode } from "react";

type CheckboxProps = {
  name: string;
  /** See TextField. */
  idPrefix?: string;
  children: ReactNode;
  error?: string;
  required?: boolean;
  defaultChecked?: boolean;
};

/** Native checkbox with a 44px tap row. Starts unchecked unless told otherwise. */
export function Checkbox({
  name,
  idPrefix = "field",
  children,
  error,
  required,
  defaultChecked,
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
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="checkbox-input mt-0.5"
        />
        <label htmlFor={id} className="text-ink">
          {children}
        </label>
        {required ? <RequiredMark /> : null}
      </div>
      {error ? (
        <p id={errorId} className="pl-9 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
