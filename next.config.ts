import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { lanAddresses } from "./scripts/lan-addresses.mjs";
import { fixedSecurityHeaders } from "./src/lib/securityHeaders";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  experimental: {
    // Texts are compiled at build time, so phones don't download the message parser (~12 KB).
    messages: { format: "json", path: "./src/messages", locales: "infer", precompile: true },
  },
});

// `pnpm dev:share` sets DEV_SHARE=1: the app is reachable through a temporary Cloudflare link
// (https://<random>.trycloudflare.com) for testers outside the Wi-Fi. Off otherwise.
const shareHosts = process.env.DEV_SHARE === "1" ? ["*.trycloudflare.com"] : [];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev-tools button sat on top of the customer tab bar on phones. Errors still pop up.
  devIndicators: false,
  // Lets a phone on the same Wi-Fi load dev assets from http://<laptop-ip>:3000.
  allowedDevOrigins: [...lanAddresses(), ...shareHosts],
  experimental: {
    // Screens preloaded in the background (useWarmRoutes, D87) count as fresh for 30 s; then
    // they're fetched again, so a tab never shows data more than half a minute old.
    staleTimes: { static: 30 },
    serverActions: {
      // Forms (server actions) only accept their own address unless the share link is listed.
      allowedOrigins: shareHosts,
      // Offer photos are shrunk in the browser first; this leaves room for one that wasn't.
      bodySizeLimit: "6mb",
    },
  },
  // Legal documents are read from /legal at request time; ship them with the server.
  outputFileTracingIncludes: { "/**": ["./legal/*.md"] },
  async headers() {
    return [
      // Security headers (§8); the Content-Security-Policy is set per page in src/proxy.ts.
      {
        source: "/:path*",
        headers: fixedSecurityHeaders(process.env.NODE_ENV === "production"),
      },
      // The service worker must never be served from a cache, or app updates would be delayed.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
