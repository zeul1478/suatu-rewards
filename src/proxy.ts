import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "@/lib/securityHeaders";
import { STORE_SLUG_HEADER, storeSlugFromPath } from "@/lib/storeFromPath";
import { customerCookieOptions } from "@/server/supabase/cookieOptions";

/**
 * Runs before every page (not static files or API routes):
 * 1. Content-Security-Policy with a fresh nonce (§8). Next.js reads the nonce from the request
 *    header and puts it on its own scripts; any other script is refused by the browser.
 * 2. Tells the page which store it belongs to, so its text is in the store's language.
 * 3. On customer pages, keeps the Supabase session fresh: validates the access token and, when
 *    it has expired, swaps the refresh token for a new one. Authorization still happens in the
 *    pages and actions themselves (getCurrentCustomer).
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  // Only this proxy decides the store; a browser can't send its own.
  requestHeaders.delete(STORE_SLUG_HEADER);
  const storeSlug = storeSlugFromPath(request.nextUrl.pathname);
  if (storeSlug) requestHeaders.set(STORE_SLUG_HEADER, storeSlug);

  const next = () => {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };
  let response = next();

  if (request.nextUrl.pathname.startsWith("/s/")) {
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        cookieOptions: customerCookieOptions(),
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            // The page renders with the refreshed cookies, the browser stores them.
            requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
            response = next();
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      },
    );
    await supabase.auth.getUser();
  }
  return response;
}

export const config = {
  matcher: [
    // Pages only: not API routes, Next's static files, or files from public/ (they have a dot).
    "/((?!api/|_next/static|_next/image|.*\\.[a-z0-9]+$).*)",
  ],
};
