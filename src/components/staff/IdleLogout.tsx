"use client";

import { useEffect, useTransition } from "react";

type IdleLogoutProps = {
  timeoutMs: number;
  logout: () => Promise<void>;
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "wheel"] as const;

/**
 * Logs the counter screen out after a stretch without taps or typing (§6: 15 minutes). The
 * server enforces the same limit on every request; this just returns the screen to the login.
 */
export function IdleLogout({ timeoutMs, logout }: IdleLogoutProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    let timer = window.setTimeout(fire, timeoutMs);
    function fire() {
      startTransition(() => logout());
    }
    function reset() {
      window.clearTimeout(timer);
      timer = window.setTimeout(fire, timeoutMs);
    }
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, reset, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset);
    };
  }, [timeoutMs, logout]);

  return null;
}
