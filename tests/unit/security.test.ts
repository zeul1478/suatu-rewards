import { describe, expect, it } from "vitest";
import { appLocale } from "@/i18n/locales";
import { redactPii } from "@/lib/mask";
import { contentSecurityPolicy, fixedSecurityHeaders } from "@/lib/securityHeaders";
import { storeSlugFromPath } from "@/lib/storeFromPath";
import { describeDetails } from "@/server/admin/auditLog";

describe("Content-Security-Policy (§8)", () => {
  it("in production: only our files and nonce scripts, no eval, no framing", () => {
    const csp = contentSecurityPolicy("abc123", false);
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("ws:");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("base-uri 'self'");
  });

  it("development adds what live reload needs", () => {
    const csp = contentSecurityPolicy("abc123", true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
  });

  it("HSTS only in production", () => {
    const names = (production: boolean) => fixedSecurityHeaders(production).map((h) => h.key);
    expect(names(true)).toContain("Strict-Transport-Security");
    expect(names(false)).not.toContain("Strict-Transport-Security");
    expect(names(false)).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy"]),
    );
  });
});

describe("store from the address, language from the store", () => {
  it.each([
    ["/s/suatu", "suatu"],
    ["/s/suatu/rewards", "suatu"],
    ["/staff/pine-street/login", "pine-street"],
    ["/dashboard/suatu/customers/123", "suatu"],
    ["/legal/suatu/program-terms", "suatu"],
    ["/legal/privacy", null],
    ["/admin", null],
    ["/", null],
    ["/s/Not_A_Slug", null],
    ["/sx/suatu", null],
  ])("%s → %s", (path, slug) => {
    expect(storeSlugFromPath(path)).toBe(slug);
  });

  it("en-US → en, ro-RO → ro, anything else → en", () => {
    expect(appLocale("en-US")).toBe("en");
    expect(appLocale("ro-RO")).toBe("ro");
    expect(appLocale("ro")).toBe("ro");
    expect(appLocale("fr-FR")).toBe("en");
    expect(appLocale(undefined)).toBe("en");
  });
});

describe("no personal data in logs (§8)", () => {
  it("masks email addresses and phone numbers inside other people's error text", () => {
    expect(
      redactPii("Can't send mail - all recipients were rejected: 550 <mihai.pop@gmail.com>"),
    ).toBe("Can't send mail - all recipients were rejected: 550 <m•••@gmail.com>");
    expect(redactPii("no account for +19545550142")).toBe("no account for ••• 0142");
    expect(redactPii("call (954) 555-0142 now")).toBe("call ••• 0142 now");
  });

  it("leaves ordinary text, short numbers and ids alone", () => {
    const text = "Recovery link failed: status 500 after 3 tries (code 42)";
    expect(redactPii(text)).toBe(text);
  });

  it("audit details read as short text, with ids shortened", () => {
    expect(
      describeDetails({
        points: 5,
        new_customer: true,
        transaction_id: "0b7e4f0e-1c55-4e43-9d1e-7c3b8f5a2d10",
      }),
    ).toBe("points 5 · new_customer true · transaction_id 0b7e4f0e");
    expect(describeDetails({})).toBe("");
    expect(describeDetails(null)).toBe("");
  });
});
