import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { lanAddresses } from "./scripts/lan-addresses.mjs";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/i18n/request.ts",
  experimental: {
    // Texts are compiled at build time, so phones don't download the message parser (~12 KB).
    messages: { format: "json", path: "./src/messages", locales: "infer", precompile: true },
  },
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The dev-tools button sat on top of the customer tab bar on phones. Errors still pop up.
  devIndicators: false,
  // Lets a phone on the same Wi-Fi load dev assets from http://<laptop-ip>:3000.
  allowedDevOrigins: lanAddresses(),
  // Legal documents are read from /legal at request time; ship them with the server.
  outputFileTracingIncludes: { "/**": ["./legal/*.md"] },
  // The service worker must never be served from a cache, or app updates would be delayed.
  async headers() {
    return [
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
