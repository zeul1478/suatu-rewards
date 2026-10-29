import type { Brand } from "@/brands";
import { ThemedImage, type ThemeMode } from "./ThemedImage";

type BrandLogoProps = {
  brand: Brand;
  /** wordmark: headers · lockup (with tagline): sign-up/login · mark (road "A"): small spots. */
  kind: "wordmark" | "lockup" | "mark";
  theme: ThemeMode;
  height: number;
  priority?: boolean;
  className?: string;
};

/** The store's logo, exactly as drawn in its brand kit (never redrawn). */
export function BrandLogo({ brand, kind, theme, height, priority, className }: BrandLogoProps) {
  const { displayScale = 1, ...files } = brand.logo[kind];
  return (
    <ThemedImage
      {...files}
      displayHeight={Math.round(height * displayScale)}
      theme={theme}
      alt={brand.name}
      priority={priority}
      className={className}
    />
  );
}
