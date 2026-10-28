import type { Metadata, Viewport } from "next";
import { barlow, barlowCondensed } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Suatu Rewards", template: "%s · Suatu Rewards" },
  description: "Earn points on every visit to Suatu.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07231a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
