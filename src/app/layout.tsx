import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { brandThemeStyle, DEFAULT_BRAND } from "@/brands";
import { brandMetadata } from "@/brands/metadata";
import { fontVariables } from "./fonts";
import "./globals.css";

// Outside a store (dev home, platform legal pages) the default brand applies; store layouts
// set their own brand and theme on top.
export const metadata: Metadata = {
  ...brandMetadata(DEFAULT_BRAND),
  description: "Earn points on every visit.",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: DEFAULT_BRAND.colors.dark.page,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: some browsers (e.g. Chrome on iOS) add attributes to <html>
    // before React loads. Only this element's own attributes are exempt, not its children.
    <html
      lang="en"
      data-theme="dark"
      style={brandThemeStyle(DEFAULT_BRAND)}
      className={`${fontVariables} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
