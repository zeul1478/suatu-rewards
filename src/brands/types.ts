/**
 * What a store brand defines. One file per store in src/brands/ (e.g. suatu.ts); its image
 * files are copied from brand/<slug>/ into public/stores/<slug>/ by `pnpm brand:sync`.
 */

/** Fonts registered in src/app/fonts.ts. To offer another, add it there and here. */
export type FontKey = "space-grotesk" | "inter";

export type Palette = {
  /** Page background. */
  page: string;
  /** Cards and panels. */
  raised: string;
  /** Inputs and inset areas. */
  sunken: string;
  /** Main text. */
  text: string;
  /** Secondary text. */
  muted: string;
  /** Brand colour: gauge fill, brand line, small headings. Also used as text. */
  brand: string;
  /** The one accent: points number, unlocked moments, icon details, focus ring. */
  accent: string;
};

/** A logo drawn for dark and for light backgrounds; width/height give its proportions. */
export type LogoFiles = {
  onDark: string;
  onLight: string;
  width: number;
  height: number;
  /**
   * Shown this many times taller than each screen asks for. Screens size logos for a long, flat
   * wordmark; a compact logo (taller than it is wide-ish) needs more height to stay readable.
   */
  displayScale?: number;
};

/** A place the customer can visit (shown on Home), with what the brand's own site says. */
export type Place = {
  /** Opening hours as written by the store, e.g. "06:30–23:00". */
  hours: string;
  address: string;
  /** What to search for in Google Maps / Waze. */
  mapsQuery: string;
  /** International format, e.g. "+40770781826". */
  phone: string;
  /** Same number on WhatsApp, if the store uses it. */
  whatsapp?: boolean;
  /** A few things to try there, in the store's own words. */
  highlights?: string[];
};

export type Brand = {
  slug: string;
  name: string;
  programName: string;
  /** Name under the home-screen icon; phones cut off anything past ~12 characters. */
  shortName: string;
  tagline: string;
  fonts: { display: FontKey; body: FontKey };
  colors: { dark: Palette; light: Palette };
  logo: { wordmark: LogoFiles; lockup: LogoFiles; mark: LogoFiles };
  icons: {
    favicon: string;
    faviconIco: string;
    appleTouch: string;
    app192: string;
    app512: string;
    maskable192: string;
    maskable512: string;
  };
  socialImage: string;
  /** Optional "Visit us" cards on the customer's Home: the station and a sister restaurant. */
  places?: { station?: Place; restaurant?: Place };
};
