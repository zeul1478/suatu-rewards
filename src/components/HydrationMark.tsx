"use client";

import { useEffect } from "react";

/**
 * Sets `data-hydrated` on <html> once React has taken over the page. Browser tests wait for it
 * before tapping (tests/e2e/support/fixtures.ts): on a slow machine running the development
 * server, a tap in the gap between the HTML arriving and React waking up could be lost.
 */
export function HydrationMark() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "";
  }, []);
  return null;
}
