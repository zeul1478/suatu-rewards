import { Instrument_Serif, Inter, Space_Grotesk } from "next/font/google";

/*
 * Every font a brand can pick (src/brands/<slug>.ts → fonts). Self-hosted by next/font: no
 * requests to Google from the visitor, no layout shift. To offer another font, add it here with
 * variable "--font-<key>" and add the key to FontKey in src/brands/types.ts.
 */

// Only "latin" is preloaded: preloading latin-ext too doubled the font bytes ahead of the logo on
// a slow phone. Every subset is still declared, so Romanian letters (ș ț ă) load when a page
// uses them.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * The company credit's own quiet serif italic ("Powered by BeHappy"), different from every
 * store's fonts so it never reads as part of the store's brand. Not preloaded: it's a footnote.
 */
const credit = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-credit",
  display: "swap",
  preload: false,
});

/** Class names that define every registered font's CSS variable; put on <html>. */
export const fontVariables = [spaceGrotesk.variable, inter.variable, credit.variable].join(" ");
