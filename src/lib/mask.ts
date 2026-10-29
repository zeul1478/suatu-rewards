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

const EMAIL_IN_TEXT = /[^\s<>"'(),;:]+@[^\s<>"'(),;:]+\.[a-z]{2,}/gi;
// "+19545550142", "954-555-0142", "(954) 555 0142": 7+ digits with common separators.
const PHONE_IN_TEXT = /\+?\(?\d[\d\s().-]{5,}\d/g;

/**
 * For server logs (§8: no PII in logs): masks anything that looks like an email address or a
 * phone number in a message we didn't write ourselves, e.g. a mail server's error.
 */
export function redactPii(text: string): string {
  return text
    .replace(EMAIL_IN_TEXT, (email) => maskEmail(email))
    .replace(PHONE_IN_TEXT, (phone) => `••• ${phone.replace(/\D/g, "").slice(-4)}`);
}
