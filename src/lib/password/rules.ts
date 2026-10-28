import "server-only";
import commonPasswords from "./common-passwords.json";
import { checkPasswordLength, type PasswordLengthIssue } from "./length";

/**
 * Password rules (spec §4.3, NIST SP 800-63B style): 8–64 characters, any characters including
 * spaces, emoji and diacritics; no composition rules; reject common passwords and passwords that
 * are the account's phone number or email. Leading/trailing spaces are kept as typed.
 */

export type PasswordIssue = PasswordLengthIssue | "common" | "matchesPhone" | "matchesEmail";

const commonSet = new Set<string>(commonPasswords);

export function checkPassword(
  password: string,
  account: { phoneE164?: string | null; email?: string | null },
): PasswordIssue | null {
  const lengthIssue = checkPasswordLength(password);
  if (lengthIssue) return lengthIssue;

  if (commonSet.has(password.normalize("NFC").toLowerCase())) return "common";
  if (account.phoneE164 && isPhoneNumber(password, account.phoneE164)) return "matchesPhone";
  if (account.email && password.trim().toLowerCase() === account.email.trim().toLowerCase()) {
    return "matchesEmail";
  }
  return null;
}

/** True when the password is the phone number written any common way: 9545550142, (954) 555-0142, +1 954… */
function isPhoneNumber(password: string, phoneE164: string): boolean {
  const stripped = password.replace(/[\s()+\-.]/g, "");
  if (!/^\d{7,15}$/.test(stripped)) return false;
  const phoneDigits = phoneE164.replace(/\D/g, "");
  return phoneDigits === stripped || phoneDigits.endsWith(stripped);
}
