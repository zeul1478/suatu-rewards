/** Languages with a messages file (src/messages/<locale>.json). English is the fallback. */
export const APP_LOCALES = ["en", "ro"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/** A store's locale (en-US, ro-RO) → the app language its screens use. */
export function appLocale(storeLocale: string | undefined): AppLocale {
  const language = storeLocale?.split("-")[0];
  return APP_LOCALES.find((locale) => locale === language) ?? "en";
}
