"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icons/Icon";

/** Chrome/Android's install prompt event (not in TypeScript's DOM types). */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

type Platform = "installed" | "ios" | "other";

function detectPlatform(): Platform {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return "installed";
  // iPadOS reports itself as a Mac; touch support tells them apart.
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

const noop = () => () => undefined;

/**
 * "Add to Home Screen" (§11): iPhone/iPad get the Share-sheet steps (Safari has no install
 * button); Chrome on Android gets a real Install button when it offers one.
 */
export function InstallHelper() {
  const t = useTranslations("install");
  const platform = useSyncExternalStore<Platform | null>(noop, detectPlatform, () => null);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const capture = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  if (platform === null) return null;
  if (platform === "installed") {
    return (
      <p className="flex items-center gap-2 text-ink">
        <Icon name="check" className="text-accent" />
        {t("installed")}
      </p>
    );
  }
  if (platform === "ios") {
    return (
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink">
        <li>{t("iosStep1")}</li>
        <li>{t("iosStep2")}</li>
        <li>{t("iosStep3")}</li>
      </ol>
    );
  }
  if (promptEvent) {
    return (
      <button
        type="button"
        className="glass glass-primary w-full"
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
      >
        <Icon name="install" />
        {t("installButton")}
      </button>
    );
  }
  return <p className="text-ink-muted">{t("browserMenu")}</p>;
}
