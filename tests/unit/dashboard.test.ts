import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { maskEmail } from "@/lib/mask";
import { detectImageType } from "@/server/offers/offers";
import { checkNewStaffPassword } from "@/server/staff/passwordPolicy";

describe("CSV export (§11)", () => {
  it("quotes commas, quotes and line breaks; empty for null", () => {
    expect(toCsv([["a", 'say "hi"', "x,y", null, 5, "two\nlines"]])).toBe(
      'a,"say ""hi""","x,y",,5,"two\nlines"\r\n',
    );
  });

  it("neutralizes cells a spreadsheet would run as formulas", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@SUM(A1)", "ok"]])).toBe(
      "'=HYPERLINK(1),'+1,'-2,'@SUM(A1),ok\r\n",
    );
    // Numbers stay numbers, negative ones included.
    expect(toCsv([[-5]])).toBe("-5\r\n");
  });
});

describe("masking (§8, §14)", () => {
  it("keeps the first letter and the domain of an email", () => {
    expect(maskEmail("mihai.pop@gmail.com")).toBe("m•••@gmail.com");
    expect(maskEmail("a@b.co")).toBe("a•••@b.co");
    expect(maskEmail("not-an-email")).toBe("•••");
  });
});

describe("new staff passwords (§6)", () => {
  it("follows the password rules in every environment", () => {
    expect(checkNewStaffPassword("0000", { staffCode: "maria" })).toBe("tooShort");
    expect(checkNewStaffPassword("password", { staffCode: "maria" })).toBe("common");
    expect(checkNewStaffPassword("Maria2026", { staffCode: "maria2026" })).toBe("matchesStaffCode");
    expect(
      checkNewStaffPassword("counter shift 7", {
        staffCode: "maria",
        currentPassword: "counter shift 7",
      }),
    ).toBe("unchanged");
    expect(checkNewStaffPassword("counter shift 7", { staffCode: "maria" })).toBeNull();
  });
});

describe("offer images", () => {
  it("trusts the file's first bytes, not its name", () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "image/png",
    );
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(detectImageType(webp)).toBe("image/webp");
    expect(detectImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
  });
});
