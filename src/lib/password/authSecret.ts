import "server-only";
import { createHash } from "node:crypto";

/**
 * Turns a customer's password into the secret stored by Supabase Auth.
 *
 * Supabase Auth hashes with bcrypt, which can't take more than 72 bytes. Our rules allow 64
 * characters of anything (§4.3), and 64 emoji or diacritics are up to 256 bytes. So we hash the
 * NFC-normalized password with SHA-256 first (43 characters, base64url) and let bcrypt salt and
 * hash that. Same password in → same secret out, on every device (DECISIONS D16).
 */
export function toAuthSecret(password: string): string {
  return createHash("sha256").update(password.normalize("NFC"), "utf8").digest("base64url");
}
