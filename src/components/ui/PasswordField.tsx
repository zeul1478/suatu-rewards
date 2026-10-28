"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import { Icon } from "./icons/Icon";
import { RequiredMark } from "./RequiredMark";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: "new-password" | "current-password";
  showLabel: string;
  hideLabel: string;
  hint?: string;
  error?: string;
  required?: boolean;
  variant?: "regular" | "large";
  inputMode?: "text" | "numeric";
};

const block = (event: ClipboardEvent | DragEvent) => event.preventDefault();

/**
 * Password input (§4.3): show/hide toggle that keeps the cursor where it was; copy, cut and drag
 * out are blocked even while shown; paste in stays allowed so password managers work. Never
 * pre-filled; uncontrolled, so the value isn't kept in React state.
 */
export function PasswordField({
  name,
  label,
  autoComplete,
  showLabel,
  hideLabel,
  hint,
  error,
  required = true,
  variant = "regular",
  inputMode,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  function toggle() {
    const input = inputRef.current;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    setVisible((current) => !current);
    // Switching type resets the selection in some browsers; put the cursor back.
    requestAnimationFrame(() => {
      if (input && start !== null && end !== null && document.activeElement === input) {
        input.setSelectionRange(start, end);
      }
    });
  }

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
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          inputMode={inputMode}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          onCopy={block}
          onCut={block}
          onDragStart={block}
          className={`field-input pr-14 ${variant === "large" ? "field-input-large" : ""}`}
        />
        <button
          type="button"
          onClick={toggle}
          // Keep focus (and the cursor) in the input when tapping the toggle.
          onMouseDown={(event) => event.preventDefault()}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[var(--radius-md)] text-ink-muted hover:text-ink"
        >
          <Icon name={visible ? "eye-off" : "eye"} />
          <span className="sr-only">{visible ? hideLabel : showLabel}</span>
        </button>
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
