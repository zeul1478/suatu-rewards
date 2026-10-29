/**
 * Masking for people's contact details on other people's screens (owner dashboard, CSV export,
 * logs). Phones use maskPhone from ./phone ("••• 0142").
 */

/** "mihai.pop@gmail.com" → "m•••@gmail.com". */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "•••";
  return `${email[0]}•••${email.slice(at)}`;
}
