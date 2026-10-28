import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { nameSchema, signupSchema } from "@/lib/validation/customer";

describe("phone numbers (§0)", () => {
  it("treats the four common formats as the same customer", () => {
    for (const typed of ["(954) 555-0142", "954-555-0142", "9545550142", "+1 954 555 0142"]) {
      expect(normalizePhone(typed), typed).toBe("+19545550142");
    }
  });

  it("accepts fictional 555 numbers and Romanian numbers", () => {
    expect(normalizePhone("305-555-0199")).toBe("+13055550199");
    expect(normalizePhone("+40 721 234 567")).toBe("+40721234567");
  });

  it("rejects things that can't be phone numbers", () => {
    for (const typed of ["", "123", "555-0142", "call me", "+1 954"]) {
      expect(normalizePhone(typed), typed).toBeNull();
    }
  });

  it("masks to the last four digits", () => {
    expect(maskPhone("+19545550142")).toBe("••• 0142");
  });
});

describe("names (§4.1)", () => {
  const firstName = nameSchema("firstName");

  it("accepts diacritics, spaces, hyphens and apostrophes; trims and collapses spaces", () => {
    for (const name of ["Ștefan", "Anne-Marie", "O'Brien", "José", "Mary  Ann"]) {
      expect(firstName.safeParse(name).success, name).toBe(true);
    }
    expect(firstName.parse("  Mary   Ann ")).toBe("Mary Ann");
  });

  it("rejects empty, digits, symbols and more than 50 characters", () => {
    expect(firstName.safeParse("  ").error?.issues[0]?.message).toBe("firstName.required");
    expect(firstName.safeParse("R2D2").error?.issues[0]?.message).toBe("firstName.invalid");
    expect(firstName.safeParse("<b>").error?.issues[0]?.message).toBe("firstName.invalid");
    expect(firstName.safeParse("a".repeat(51)).error?.issues[0]?.message).toBe("firstName.tooLong");
  });
});

describe("sign-up form", () => {
  const valid = {
    phone: "954-555-0142",
    firstName: "Andrei",
    lastName: "Popescu",
    email: " Andrei.Demo@Example.TEST ",
    password: "coffee before the drive",
    acceptTerms: "on",
    confirmAdult: "on",
  };

  it("normalizes phone and email", () => {
    const parsed = signupSchema.parse(valid);
    expect(parsed.phone).toBe("+19545550142");
    expect(parsed.email).toBe("andrei.demo@example.test");
  });

  it("requires both checkboxes; marketing stays optional and off", () => {
    const unticked = { ...valid, acceptTerms: undefined, confirmAdult: undefined };
    const messages = signupSchema.safeParse(unticked).error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(["acceptTerms.required", "confirmAdult.required"]);
    expect(signupSchema.parse(valid).marketingEmail).toBeUndefined();
  });
});

describe("form errors", () => {
  it("falls back to a translatable message when a schema forgot its message key", async () => {
    const { z } = await import("zod");
    const { fieldErrorsFrom } = await import("@/lib/forms");
    const result = z
      .object({ a: z.string(), b: z.string().min(1, "b.required") })
      .safeParse({ b: "" });
    expect(fieldErrorsFrom(result.error!)).toEqual({ a: "form.checkField", b: "b.required" });
  });
});
