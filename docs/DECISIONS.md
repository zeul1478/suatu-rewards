# Decisions

Changes to, or interpretations of, `MVP_SPEC.md`. Newest last. Anything marked **⚖ legal review** must be checked by a lawyer before a real launch.

## 2026-10-28 — Milestone 1 kickoff

### D1. This app is a working demo, not a launch

The real product idea is the landing page + waitlist (multi-business loyalty app). This repo is an MVP **example** using Suatu as the demo store, for internal use only. No real customers.

- Legal pages are short demo versions based on the wording style of `legal/privacy-policy.md` and `legal/terms-of-service.md` (originals kept unchanged), each labelled "Demo — not for real customers".
- Production safety guards stay (e.g. `0000` refused in production), so the demo can become a product without a rewrite.

### D2. One `0000 / 0000` account for every non-customer screen (dev only)

Staff screen, owner dashboard and `/admin` all log in with **user name `0000`, password `0000`**. In development it's a single account with every permission (cashier + manager + owner + admin). It remains the only non-customer account in the seed.

- Production builds refuse `0000` (and any staff/admin password under 8 characters) and force a real password — with a test.

### D3. No email field on any log-in screen

- Customers log in with phone + password; staff/owner/admin with user name + password.
- Email is asked **only** at sign-up (required, marked `*`).
- "Forgot password?" asks for the **phone number** only; the reset link goes to the email already on the account.

### D4. Release a claimed phone number (manager action) — ⚖ legal review

There's no SMS, so phone ownership is never proven. Someone could sign up with another person's number and take over its points (§0 step 11). For a coffee-sized reward this is acceptable in the demo, with a manager "release number" action in the dashboard (M7). SMS verification is required before any real launch.

### D5. Unused auto-created accounts are deleted after 12 months — ⚖ legal review

Staff can create an account just by typing a number (§0 step 10), before that person has seen any notice. Unclaimed accounts with no activity for 12 months are deleted. The printable counter sign (M7) doubles as the notice at collection. Matches the 12-month retention already in the waitlist privacy policy.

### D6. Fonts: Barlow + Barlow Condensed instead of Space Grotesk + Inter

The spec gave these as an example. Inter is the stock "AI template" font; Barlow is based on highway signage and fits a gas station. See `docs/DESIGN.md`.

### D7. Colour contrast fixes to §9

Secondary glass border 0.18 → 0.40 opacity (was 1.7:1, needs 3:1). Light theme uses darker red/amber. Details in `docs/DESIGN.md`.

### D8. Local Supabase runs on ports 55321–55324 (not the default 54321–54324)

Another local project (Photooo) already uses the default ports. Moving ours lets both run at once. Realtime, edge functions and analytics containers are disabled (unused; saves memory).

### D9. Node 24 LTS, pinned per project

`.nvmrc` = 24; `engines` in `package.json`. The Mac's global Node (Homebrew 25) is untouched. pnpm via corepack, Supabase CLI as a dev dependency (`pnpm supabase …`), so almost nothing is installed system-wide.

### D10. Next.js 16 with Cache Components on (framework default)

Kept the scaffold's `cacheComponents` + `partialPrefetching`: Next.js says both become always-on in the next major version, so turning them off now would mean a migration later. Pages that read cookies/session will wrap that part in `<Suspense>`.

### D11. Phone over Wi-Fi uses plain HTTP until Milestone 2

Browsers treat `http://<laptop-ip>` as insecure: no `Secure` cookies, no service worker, no Wake Lock, no `crypto.randomUUID`. Plan:

- `Secure` cookie flag only in production builds.
- **Updated in M2:** HTTPS via mkcert is postponed to Milestone 5. Nothing in M2–M4 needs a secure page on the phone (login cookies aren't `Secure` in development), and it saves you installing a certificate on two phones now. The PWA, service worker and Wake Lock (M5) do need it.
- Idempotency keys are generated on the server, never with `crypto.randomUUID` in the browser.

### D12. Copy/cut blocked on password fields; paste allowed

As §4.3 asks. Paste stays allowed so password managers work (NIST SP 800-63B). Blocking copy is a light deterrent only (dev tools can bypass it).

### D13. Lockout after 5 wrong passwords can be abused

Anyone who knows a customer's number can lock them out for 15 minutes. Kept as specified; the lock message points to "Forgot password?", which still works while locked.

### D14. Staff can add unlimited visits

`daily_earn_cap` and `repeat_entry_warning_seconds` are NULL for Suatu (§0 step 6 needs quick repeats). Every entry is audited with the staff ID; the dashboard (M7) gets a "most points today, per staff / per customer" view.

### D15. `suppressHydrationWarning` on `<html>` only

Chrome on iOS (and some extensions) add attributes such as `__gcrremoteframetoken` to `<html>` before React loads, which shows a hydration error in development. Suppressing it on the `<html>` element covers only that element's own attributes; real mismatches anywhere inside the page are still reported.

## 2026-10-28 — Milestone 2

### D16. Customer passwords are pre-hashed before Supabase Auth

Supabase Auth uses bcrypt, which refuses passwords over 72 bytes; §4.3 allows 64 characters of anything (64 emoji = 256 bytes). The server sends `base64url(SHA-256(NFC(password)))` (43 characters) instead, and bcrypt salts and hashes that. NFC normalization means "ș" typed on iPhone and Android gives the same password. Code: `src/lib/password/authSecret.ts`.

### D17. Placeholder SMS provider in `supabase/config.toml`

Supabase only turns on phone + password login when an SMS provider is configured. The config names Twilio with fake values. It is never called: accounts are created on the server with the phone pre-confirmed, and nothing asks Auth to send an SMS (TCPA, §8). Production needs the same (or a real provider once SMS is in scope).

### D18. Login throttling lives in our database, not in Supabase Auth

Every login request reaches Supabase from the Next.js server's IP, so Auth's per-IP limit would throttle all customers together. Auth's limits are raised; our own `auth_throttles` table does per-phone (5 → 15 min), per-staff-account (5 → 15 min) and per-IP (30 / 15 min, `LOGIN_MAX_FAILURES_PER_IP`) limits. The IP comes from `x-forwarded-for`, which Vercel sets; locally tests set it to simulate separate devices.

### D19. Staff lockout uses `auth_throttles` instead of columns on `staff`

§7 lists `failed_attempts` / `locked_until` on the staff table. One throttle mechanism for customers, staff and IPs is simpler and is tested once.

### D20. Legal documents are Markdown files in `/legal`, versioned in git

Instead of a `legal_documents` table for now: the files are reviewed as text, and the `version` in each file's front matter is what consent records store. A table (for owner-edited documents) can come with store #2. Program terms are one file while there's one store.

### D21. Reset links carry the customer id; email verification is our own token

- The reset link includes the customer id, so the password rules (not the phone/email) are checked **before** the single-use Supabase token is spent. A rejected password doesn't burn the link.
- Using a reset link marks the email as confirmed (it proves the inbox is theirs).
- Email confirmation uses our own 24-hour single-use token, independent of Supabase's email confirmation (which would block phone login flows).

### D22. "Sign out other devices" is immediate

Customer pages check the session with Supabase Auth on every request (`getUser()`, not a local token check), so a session ended by a password change or reset stops working at once, not when its token expires.

### D23. Customer session cookies are httpOnly

The browser never talks to Supabase, so it never needs to read the session cookie. Secure in production, 30-day lifetime (§4.2).
