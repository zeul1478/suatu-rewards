"use client";

import { useEffect } from "react";

/**
 * Registers the customer app's service worker for this store (public/sw.js). Browsers only
 * allow it on secure pages: https, or http://localhost on the laptop.
 */
export function ServiceWorker({ storeSlug, scope }: { storeSlug: string; scope: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker
      .register(`/sw.js?store=${encodeURIComponent(storeSlug)}`, { scope })
      .catch(() => undefined);
  }, [storeSlug, scope]);
  return null;
}
