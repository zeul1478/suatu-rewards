import type { Brand } from "./types";

/*
 * Suatu — "The Road" (brand/suatu/README.md). Everything that makes the app look like Suatu.
 * Colours from the brand kit; files copied into public/stores/suatu/ by `pnpm brand:sync`.
 */

const file = (path: string) => `/stores/suatu/${path}`;

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
  logo: {
    wordmark: {
      onDark: file("svg/wordmark-dark.svg"),
      onLight: file("svg/wordmark-light.svg"),
      width: 618.4,
      height: 148,
    },
    lockup: {
      onDark: file("svg/lockup-dark.svg"),
      onLight: file("svg/lockup-light.svg"),
      width: 618.4,
      height: 224,
    },
    mark: {
      onDark: file("svg/mark-dark.svg"),
      onLight: file("svg/mark-light.svg"),
      width: 160,
      height: 160,
    },
  },
  icons: {
    favicon: file("svg/favicon.svg"),
    faviconIco: file("png/favicon.ico"),
    appleTouch: file("png/apple-touch-icon.png"),
    app192: file("png/icon-192.png"),
    app512: file("png/icon-512.png"),
    maskable192: file("png/icon-maskable-192.png"),
    maskable512: file("png/icon-maskable-512.png"),
  },
  socialImage: file("png/og-image.png"),
};
