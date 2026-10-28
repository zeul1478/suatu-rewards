"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * After a failed submit, move focus to the first invalid field so keyboard and screen-reader
 * users land on the problem (and the on-screen keyboard brings it into view).
 */
export function useFocusFirstError(
  status: string,
  attempt: unknown,
): RefObject<HTMLFormElement | null> {
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (status !== "error") return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalid?.focus();
  }, [status, attempt]);
  return formRef;
}
