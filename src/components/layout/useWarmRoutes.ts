"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type PrefetchOptions = NonNullable<Parameters<ReturnType<typeof useRouter>["prefetch"]>[1]>;
/** The whole screen, data included (not just its frame up to the loading placeholder). */
const FULL = "full" as PrefetchOptions["kind"];

/** Fired (on window) when something the screens show has changed, e.g. new points on Home. */
export const DATA_CHANGED_EVENT = "app:data-changed";

/**
 * Tells every preloaded screen to fetch itself again (useWarmRoutes). This also reloads the
 * screen on display, so a screen that shows a result of its own (the redeem confirmation) uses
 * refreshWhenLeaving instead.
 */
export function announceDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

let refreshOnNextScreen = false;

/** Like announceDataChanged, but waits until the customer moves to another screen. */
export function refreshWhenLeaving() {
  refreshOnNextScreen = true;
}

/** How often copies older than staleTimes (next.config.ts) are fetched again. */
const REFRESH_MS = 15_000;

/**
 * The first preload waits until the app has loaded and the phone is idle, so the screen the
 * customer opened isn't slowed down by the others (performance budget, tests/prod).
 */
const FIRST_WARM_DELAY_MS = 2_000;
let firstWarmDone = false;

/**
 * Keeps the app's other screens (the tabs, the dashboard sections) ready in memory, so a tap shows
 * them at once instead of waiting for the server (D87):
 * - each screen is fetched in the background once the app has opened (FIRST_WARM_DELAY_MS),
 *   and again after every screen change (the screen just left included);
 * - every REFRESH_MS, copies older than staleTimes (next.config.ts) are fetched again;
 * - nothing is fetched while the app is in the background; coming back refreshes everything;
 * - a DATA_CHANGED_EVENT (new points, a reward used…) refreshes everything straight away.
 * Copies live in the page's memory only: nothing is written to the phone, and they're gone when
 * the app closes. Production only; the development server doesn't prefetch.
 */
export function useWarmRoutes(hrefs: readonly string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const key = hrefs.join("|");

  useEffect(() => {
    const list = key.split("|");
    let stopped = false;
    function warm(href: string) {
      if (stopped) return;
      if (document.visibilityState !== "visible") return;
      // A copy that's still fresh isn't fetched again.
      router.prefetch(href, { kind: FULL, onInvalidate: () => warm(href) });
    }
    function warmAll() {
      for (const href of list) warm(href);
    }
    // Refresh drops the cached copies, and onInvalidate (above) fetches each one again.
    function refreshAll() {
      router.refresh();
      warmAll();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") warmAll();
    }

    let first: number | undefined;
    if (refreshOnNextScreen) {
      refreshOnNextScreen = false;
      refreshAll();
    } else if (firstWarmDone) warmAll();
    else {
      first = window.setTimeout(() => {
        firstWarmDone = true;
        if ("requestIdleCallback" in window)
          window.requestIdleCallback(warmAll, { timeout: 2_000 });
        else warmAll();
      }, FIRST_WARM_DELAY_MS);
    }
    const timer = window.setInterval(warmAll, REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(DATA_CHANGED_EVENT, refreshAll);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(DATA_CHANGED_EVENT, refreshAll);
    };
  }, [key, router, pathname]);
}
