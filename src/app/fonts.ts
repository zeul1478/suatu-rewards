import { Inter, Space_Grotesk } from "next/font/google";

/*
 * Every font a brand can pick (src/brands/<slug>.ts → fonts). Self-hosted by next/font: no
 * requests to Google from the visitor, no layout shift. To offer another font, add it here with
 * variable "--font-<key>" and add the key to FontKey in src/brands/types.ts.
 */

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

/** Class names that define every registered font's CSS variable; put on <html>. */
export const fontVariables = [spaceGrotesk.variable, inter.variable].join(" ");
