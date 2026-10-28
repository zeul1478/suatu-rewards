import { describe, expect, it } from "vitest";
import { staffPasswordAllowed } from "@/server/staff/passwordPolicy";

describe("staff password production guard (§6)", () => {
  it("allows the 0000 development password in development", () => {
    expect(staffPasswordAllowed("0000", { production: false })).toBe(true);
  });

  it("refuses 0000 and anything under 8 characters in production", () => {
    expect(staffPasswordAllowed("0000", { production: true })).toBe(false);
    expect(staffPasswordAllowed("1234567", { production: true })).toBe(false);
  });

  it("allows a real password in production", () => {
    expect(staffPasswordAllowed("counter-shift-2026", { production: true })).toBe(true);
  });
});
