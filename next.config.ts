import type { NextConfig } from "next";
import { lanAddresses } from "./scripts/lan-addresses.mjs";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Lets a phone on the same Wi-Fi load dev assets from http://<laptop-ip>:3000.
  allowedDevOrigins: lanAddresses(),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
