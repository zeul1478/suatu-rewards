import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { STORE_SLUG_HEADER } from "@/lib/storeFromPath";
import { appLocale, type AppLocale } from "./locales";
import { getStoreLocale } from "@/server/stores/getStore";

/*
 * Each store's screens speak the store's language (stores.locale: en-US → en, ro-RO → ro).
 * The store comes from the URL, passed on by src/proxy.ts. Outside a store (dev home, /admin,
 * platform legal pages) it's English.
 */

const messages: Record<AppLocale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../messages/en.json"),
  ro: () => import("../messages/ro.json"),
};

export default getRequestConfig(async () => {
  const slug = (await headers()).get(STORE_SLUG_HEADER);
  const store = slug ? await getStoreLocale(slug) : null;
  const locale = appLocale(store?.locale);
  return {
    locale,
    timeZone: store?.timezone ?? "America/New_York",
    messages: (await messages[locale]()).default,
  };
});
