import type { CSSProperties } from "react";
import { suatu } from "./suatu";
import type { Brand, FontKey, Palette } from "./types";

/**
 * All store brands by store slug. Add a store: create src/brands/<slug>.ts, copy its files with
 * `pnpm brand:sync <slug>`, and list it here. Pages outside a store (dev home, platform legal
 * pages) use the default brand.
 */
export const brands: Record<string, Brand> = { suatu };

export const DEFAULT_BRAND = suatu;

export function brandFor(storeSlug: string): Brand {
  return brands[storeSlug] ?? DEFAULT_BRAND;
}

/**
 * A brand as CSS custom properties for the element that wraps its screens. The semantic tokens
 * in src/styles/tokens.css read these, so components never refer to brand colours directly.
 */
export function brandThemeStyle(brand: Brand): CSSProperties {
  return {
    ...paletteVars("dark", brand.colors.dark),
    ...paletteVars("light", brand.colors.light),
    "--brand-font-display": fontVar(brand.fonts.display),
    "--brand-font-body": fontVar(brand.fonts.body),
  } as CSSProperties;
}

function paletteVars(theme: "dark" | "light", palette: Palette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([name, value]) => [`--brand-${theme}-${name}`, value]),
  );
}

/** Matches the CSS variable each font gets in src/app/fonts.ts. */
function fontVar(key: FontKey): string {
  return `var(--font-${key})`;
}

export type { Brand } from "./types";
