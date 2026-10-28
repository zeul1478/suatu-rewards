import { describe, expect, it } from "vitest";
import { toAuthSecret } from "@/lib/password/authSecret";
import { checkPasswordLength, passwordLength } from "@/lib/password/length";
import { checkPassword } from "@/lib/password/rules";
import { toAuthSecret as seedScriptSecret } from "../../scripts/seed-demo.mjs";

const account = { phoneE164: "+19545550142", email: "andrei.demo@example.test" };

describe("password length (§4.3b)", () => {
  it("rejects 7, accepts 8 and 64, rejects 65", () => {
    expect(checkPasswordLength("a".repeat(7))).toBe("tooShort");
    expect(checkPasswordLength("a".repeat(8))).toBeNull();
    expect(checkPasswordLength("a".repeat(64))).toBeNull();
    expect(checkPasswordLength("a".repeat(65))).toBe("tooLong");
  });

  it("counts emoji and diacritics as one character each", () => {
    expect(passwordLength("🚗⛽ș")).toBe(3);
    expect(checkPasswordLength("🚗".repeat(64))).toBeNull();
    expect(checkPasswordLength("ș".repeat(65))).toBe("tooLong");
  });

  it("counts a decomposed diacritic (s + comma below) the same as the composed one", () => {
    expect(passwordLength("ș")).toBe(passwordLength("ș"));
  });

  it("allows spaces anywhere", () => {
    expect(checkPassword("  two spaces  ", account)).toBeNull();
  });
});

describe("password blocklist (§4.3)", () => {
  it("rejects common passwords in any letter case", () => {
    expect(checkPassword("password123", account)).toBe("common");
    expect(checkPassword("PASSWORD123", account)).toBe("common");
    expect(checkPassword("iloveyou2", account)).not.toBe("tooShort");
  });

  it("rejects the account's phone number written any common way", () => {
    for (const typed of [
      "9545550142",
      "19545550142",
      "+19545550142",
      "(954) 555-0142",
      "954-555-0142",
    ]) {
      expect(checkPassword(typed, account), typed).toBe("matchesPhone");
    }
  });

  it("rejects the account's email, ignoring case and surrounding spaces", () => {
    expect(checkPassword("Andrei.Demo@Example.test", account)).toBe("matchesEmail");
    expect(checkPassword(" andrei.demo@example.test ", account)).toBe("matchesEmail");
  });

  it("accepts an ordinary passphrase", () => {
    expect(checkPassword("coffee before the drive", account)).toBeNull();
  });
});

describe("auth secret (DECISIONS D16)", () => {
  it("is 43 characters whatever the password length, so bcrypt's 72-byte limit never applies", () => {
    expect(toAuthSecret("a")).toHaveLength(43);
    expect(toAuthSecret("ș".repeat(64))).toHaveLength(43);
  });

  it("is the same for composed and decomposed diacritics, different for different spaces", () => {
    expect(toAuthSecret("ș parola")).toBe(toAuthSecret("ș parola"));
    expect(toAuthSecret(" spaced ")).not.toBe(toAuthSecret("spaced"));
  });

  it("matches the copy in the demo seed script", () => {
    expect(seedScriptSecret("suatu demo coffee")).toBe(toAuthSecret("suatu demo coffee"));
  });
});
