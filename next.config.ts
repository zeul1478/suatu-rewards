import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { lanAddresses } from "./scripts/lan-addresses.mjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi load dev assets from http://<laptop-ip>:3000.
  allowedDevOrigins: lanAddresses(),
  // Legal documents are read from /legal at request time; ship them with the server.
  outputFileTracingIncludes: { "/**": ["./legal/*.md"] },
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
