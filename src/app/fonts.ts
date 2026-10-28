import { Barlow, Barlow_Condensed } from "next/font/google";

// Barlow is modelled on California highway signage — road-side, legible,
// a little industrial (docs/DESIGN.md). Self-hosted by next/font: no layout shift.
export const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-barlow",
  display: "swap",
});

// Condensed cut for headings and the price-sign points display.
export const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});
