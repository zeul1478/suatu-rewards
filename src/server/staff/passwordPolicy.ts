/**
 * Production safety for staff passwords (§6, DECISIONS D2). The development seed uses 0000/0000;
 * a production build refuses that account until the owner sets a real password.
 * Pure function so tests can prove the rule without a production build.
 */

export const STAFF_MIN_PASSWORD_LENGTH = 8;

export function staffPasswordAllowed(password: string, environment: { production: boolean }) {
  if (!environment.production) return true;
  return password !== "0000" && password.length >= STAFF_MIN_PASSWORD_LENGTH;
}
