import "server-only";
import { headers } from "next/headers";
import { isProduction } from "@/server/env";
import { lanAddresses } from "../../scripts/lan-addresses.mjs";

/**
 * Best-effort client IP for rate limiting. In development the header comes straight from the
 * browser (tests set it to simulate different devices); behind Vercel it's set by the platform.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}

/** Origin the visitor is using (http://10.0.0.157:3000 on a phone), for links in emails. */
export async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

/**
 * Origin to print for other devices (the counter sign's QR code). In development a laptop at
 * localhost would print an address phones can't open, so the Wi-Fi address is used instead.
 */
export async function shareableOrigin(): Promise<string> {
  const origin = await requestOrigin();
  if (isProduction()) return origin;
  const url = new URL(origin);
  const [lan] = lanAddresses();
  if ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && lan) url.hostname = lan;
  return url.origin;
}
