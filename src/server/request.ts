import "server-only";
import { headers } from "next/headers";

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
