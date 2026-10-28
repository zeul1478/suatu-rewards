import type { CookieOptionsWithName } from "@supabase/ssr";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

/**
 * Customer session cookies (§4.2): httpOnly (the browser never reads them — all Supabase calls
 * happen on the server), 30-day "remember me", Secure in production. Plain HTTP over Wi-Fi in
 * development can't store Secure cookies, hence the switch (DECISIONS D11).
 */
export function customerCookieOptions(): CookieOptionsWithName {
  return {
    name: "suatu-auth",
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: THIRTY_DAYS,
  };
}
