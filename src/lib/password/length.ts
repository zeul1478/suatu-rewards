/** Password length rules (spec §4.3). Small and dependency-free, so the browser can use them too. */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export type PasswordLengthIssue = "tooShort" | "tooLong";

/** Length in characters as a person counts them (an emoji or "ș" is one), after Unicode NFC. */
export function passwordLength(password: string): number {
  return [...password.normalize("NFC")].length;
}

export function checkPasswordLength(password: string): PasswordLengthIssue | null {
  const length = passwordLength(password);
  if (length < PASSWORD_MIN_LENGTH) return "tooShort";
  if (length > PASSWORD_MAX_LENGTH) return "tooLong";
  return null;
}
