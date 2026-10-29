import { checkPassword, type PasswordIssue } from "@/lib/password/rules";

/**
 * Production safety for staff passwords (§6, DECISIONS D2). The development seed uses 0000/0000;
 * a production build refuses that account until a real password is set at login.
 * Pure functions so tests can prove the rules without a production build.
 */

export const STAFF_MIN_PASSWORD_LENGTH = 8;

export function staffPasswordAllowed(password: string, environment: { production: boolean }) {
  if (!environment.production) return true;
  return password !== "0000" && password.length >= STAFF_MIN_PASSWORD_LENGTH;
}

export type StaffPasswordIssue = PasswordIssue | "matchesStaffCode" | "unchanged";

/**
 * A password a person chooses for a staff account (first login, owner's temporary password):
 * the customer rules (8–64 characters, not a common password) in every environment, and not
 * the user name or the password being replaced.
 */
export function checkNewStaffPassword(
  password: string,
  account: { staffCode: string; currentPassword?: string },
): StaffPasswordIssue | null {
  const issue = checkPassword(password, {});
  if (issue) return issue;
  if (password.trim().toLowerCase() === account.staffCode.toLowerCase()) return "matchesStaffCode";
  if (account.currentPassword !== undefined && password === account.currentPassword) {
    return "unchanged";
  }
  return null;
}
