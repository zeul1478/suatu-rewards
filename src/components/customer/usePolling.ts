"use client";

import { useEffect, useRef } from "react";

/**
 * Fetches `url` every `intervalMs` while the page is visible (spec §3: 3 s, paused when hidden),
 * and once right away when it becomes visible again. Network errors are ignored; the next tick
 * tries again.
 */
export function usePolling<T>(url: string, intervalMs: number, onData: (data: T) => void) {
  const onDataRef = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  });

  useEffect(() => {
    let timer: number | undefined;
    let controller: AbortController | undefined;

    async function tick() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (response.ok) onDataRef.current((await response.json()) as T);
      } catch {
        // Offline or aborted: try again on the next tick.
      }
    }

    function start() {
      stop();
      timer = window.setInterval(tick, intervalMs);
    }
    function stop() {
      window.clearInterval(timer);
      controller?.abort();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") {
        void tick();
        start();
      } else {
        stop();
      }
    }

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, intervalMs]);
}
