import type { Brand } from "./types";

/*
 * Suatu (brand/suatu/README.md). Everything that makes the app look like Suatu.
 * Colours from the brand kit; files copied into public/stores/suatu/ by `pnpm brand:sync`.
 */

const logo = (name: string) => `/stores/suatu/png/complex-turistic/${name}`;

export const suatu: Brand = {
  slug: "suatu",
  name: "Suatu",
  programName: "Suatu Rewards",
  shortName: "Suatu",
  tagline: "Fuel · Shop · Rewards",
  fonts: { display: "space-grotesk", body: "inter" },
  colors: {
    dark: {
      page: "#07231A", // Forest
      raised: "#0E3B2C",
      sunken: "#0A2E22",
      text: "#EAF4EE", // Mist
      muted: "#9DB8AA",
      brand: "#3FBF7F", // Gauge green
      accent: "#C6F06A", // Signal lime
    },
    light: {
      page: "#EAF4EE", // Mist
      raised: "#FFFFFF",
      sunken: "#E4F0E9", // lighter than the M1 #DCEBE2 so Suatu green text passes 4.5:1 on it
      text: "#07231A", // Forest
      muted: "#3D5C4E",
      brand: "#1E7A4F", // Suatu green
      accent: "#1E7A4F", // On light, the lane and icon details are Suatu green (brand rule)
    },
  },
  // The "complex turistic" logo (brand/suatu/complex-turistic/, white original). Light screens
  // get the same artwork in Forest; files made by scripts/suatu-logo.py. It's compact rather
  // than a long strip, so it's shown larger than the old wordmark (displayScale).
  logo: {
    wordmark: {
      onDark: logo("logo-on-dark.png"),
      onLight: logo("logo-on-light.png"),
      width: 723,
      height: 480,
      displayScale: 2.6,
    },
    lockup: {
      onDark: logo("logo-on-dark.png"),
      onLight: logo("logo-on-light.png"),
      width: 723,
      height: 480,
      displayScale: 1.6,
    },
    mark: {
      onDark: logo("mark-on-dark.png"),
      onLight: logo("mark-on-light.png"),
      width: 189,
      height: 320,
    },
  },
  icons: {
    favicon: logo("favicon-32.png"),
    faviconIco: logo("favicon.ico"),
    appleTouch: logo("apple-touch-icon.png"),
    app192: logo("icon-192.png"),
    app512: logo("icon-512.png"),
    maskable192: logo("icon-maskable-192.png"),
    maskable512: logo("icon-maskable-512.png"),
  },
  socialImage: logo("og-image.png"),
};
