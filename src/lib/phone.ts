import {
  isPossiblePhoneNumber,
  parsePhoneNumberWithError,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "US";

/**
 * Normalizes any common way of typing a phone number to E.164 (+19545550142).
 * Format check only (spec §4.1): fictional numbers such as 555 numbers are accepted so testers
 * can use made-up data. Numbers starting with + keep their own country (e.g. +40 for Romania).
 * Returns null when the input can't be a phone number.
 */
export function normalizePhone(
  input: string,
  country: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const trimmed = input.trim();
  if (trimmed === "" || !isPossiblePhoneNumber(trimmed, country)) return null;
  try {
    return parsePhoneNumberWithError(trimmed, country).number;
  } catch {
    return null;
  }
}

/** "+19545550142" → "••• 0142". Use whenever a phone number appears in logs or other people's screens. */
export function maskPhone(e164: string): string {
  return `••• ${e164.slice(-4)}`;
}
