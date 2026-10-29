/*
 * Security headers (spec §8). The Content-Security-Policy changes on every page view (its
 * nonce), so src/proxy.ts sets it; the fixed headers are in next.config.ts.
 */

/**
 * Only our own files and Next.js's nonce-carrying scripts run. Inline style attributes stay
 * allowed (React's style={…}, the brand colours on each screen); they can't run code.
 * Development adds what Next's live reload needs: eval for error overlays, websockets.
 */
export function contentSecurityPolicy(nonce: string, development: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // blob: the offer-photo preview before upload; data: tiny inline images.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** The same on every response (pages, API, files). HSTS only in production (HTTPS hosts). */
export function fixedSecurityHeaders(production: boolean): { key: string; value: string }[] {
  return [
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Old browsers that don't know CSP frame-ancestors.
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    ...(production
      ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
      : []),
  ];
}
