"use client";

import { useEffect, useRef } from "react";

type SlowDown = {
  /** After this long with identical answers, poll every `intervalMs` instead. */
  afterMs: number;
  intervalMs: number;
};

/**
 * Fetches `url` every `intervalMs` while the page is visible (spec §3: 3 s, paused when hidden),
 * and once right away when it becomes visible again. Network errors are ignored; the next tick
 * tries again.
 *
 * With `slowDown`, a screen left open with nothing changing polls less often (battery, data);
 * any change, or coming back to the app, returns to the fast pace.
 */
export function usePolling<T>(
  url: string,
  intervalMs: number,
  onData: (data: T) => void,
  slowDown?: SlowDown,
) {
  const onDataRef = useRef(onData);
  useEffect(() => {
    onDataRef.current = onData;
  });
  const slowAfterMs = slowDown?.afterMs;
  const slowIntervalMs = slowDown?.intervalMs;

  useEffect(() => {
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let lastText: string | undefined;
    let unchangedSince = Date.now();
    // Bumped on every stop, so a tick still in flight doesn't schedule another one.
    let generation = 0;

    function nextDelay() {
      const idle = slowAfterMs !== undefined && Date.now() - unchangedSince >= slowAfterMs;
      return idle && slowIntervalMs ? slowIntervalMs : intervalMs;
    }

    async function tick() {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (response.ok) {
          const text = await response.text();
          if (text !== lastText) {
            lastText = text;
            unchangedSince = Date.now();
          }
          onDataRef.current(JSON.parse(text) as T);
        }
      } catch {
        // Offline or aborted: try again on the next tick.
      }
    }

    function schedule() {
      const current = generation;
      timer = window.setTimeout(async () => {
        await tick();
        if (current === generation) schedule();
      }, nextDelay());
    }
    function stop() {
      generation += 1;
      window.clearTimeout(timer);
      controller?.abort();
    }
    function onVisibility() {
      stop();
      if (document.visibilityState === "visible") {
        unchangedSince = Date.now();
        void tick();
        schedule();
      }
    }

    if (document.visibilityState === "visible") schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, intervalMs, slowAfterMs, slowIntervalMs]);
}
