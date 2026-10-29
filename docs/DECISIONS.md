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

### D15. `suppressHydrationWarning` on `<html>`, forms and inputs

Chrome on iOS (and some extensions) add attributes such as `__gcrremoteframetoken` to `<html>` before React loads, which shows a hydration error in development. Suppressing it on the `<html>` element covers only that element's own attributes; real mismatches anywhere inside the page are still reported. **Extended in M4:** Chrome on iOS also stamps `__gcruniqueid` on every `<form>` and `<input>` (autofill), so those elements carry the same flag. It only affects each element's own attributes, never its content.

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

## 2026-10-28 — Milestone 3

### D24. Points move when the cashier confirms the code, not when it's shown

Tapping Redeem only creates a 6-digit code (5 minutes). The ledger row and the balance change happen in `complete_redemption`, when staff type the code. An expired or abandoned code costs the customer nothing. A new code cancels the customer's previous one.

### D25. Wrong redemption codes are throttled per staff member

§4.3b says "wrong code 5× → locked". Staff don't say whose code it is, so the lock is on the staff member typing: 5 wrong codes → that person can't redeem for 15 minutes (same `auth_throttles` table). Wrong, expired, used and other-store codes all give the same answer.

### D26. `link_customer_on_signup` is part of `register_customer`

§7 lists a separate function. Points belong to the customer row, so claiming the `unclaimed` row at sign-up (M2) is what attaches them — nothing to copy. Tested: earn as unknown number → sign up → same balance.

### D27. Void and owner adjustments come with their screens

`void_transaction` (M6, recent entries) and `adjust_points` (M7, dashboard) are built with the screens that use them, so no unused code ships now. The ledger already has the `reversal` / `adjust` types and `reverses_transaction_id`.

### D28. Idempotency keys come from the server

The counter page renders a fresh random key with the form; every successful Add visit returns the next one. A double tap or a retried request reuses the same key and is counted once; a new entry always has a new key (§0 rule 1). The database enforces it with a unique index, also when two requests race.

### D29. Countdown uses the server's "seconds left"

The code screen counts down from the server's figure using elapsed time on the phone, so a phone with a wrong clock still shows the right time.

### D30. Customer status is polled at `/api/s/[store]/status`

Every 3 s while visible, paused when hidden (§3). The route sets refreshed session cookies itself (the proxy only covers `/s/*`). Polling responses are `no-store`.

### D31. Sign-up sends the confirmation email after responding

With `after()`, so slow email delivery never delays reaching the home screen.

### Open question — brand kit fonts

`brand/suatu/README.md` (added during M3) says Space Grotesk + Inter; D6 chose Barlow + Barlow Condensed. To settle before Milestone 4.

## 2026-10-28 — Milestone 4, part 1: brand kit

### D32. Fonts: Space Grotesk + Inter (replaces D6)

Chosen by the owner to match the brand kit: the SUATU wordmark is drawn in Space Grotesk. Space Grotesk for headings and numbers, Inter for body. Both self-hosted with `next/font`.

### D33. Brand settings live in the app; brand/ keeps the originals

- `brand/` is the owner's folder of original files. The app never moves or edits it.
- `pnpm brand:sync` copies what's served into `public/stores/<slug>/` (logo, icons, OG image) and `public/platform/behappy/` (badges). The copies are committed so a deploy needs no extra step.
- Each store's look is one typed file, `src/brands/<slug>.ts`: names, both colour palettes, fonts, logo and icon paths. Colours reach the screens only through CSS variables (`brandThemeStyle` → `src/styles/tokens.css`), so a new store, or another app built from this code, is a new brand file, not new components.
- `tests/unit/brands.test.ts` fails if a brand points at a missing file or a colour pair drops below WCAG AA.

### D34. Custom icons only: `<Icon name="…">`

Built from `brand/suatu/icons/svg/` by `pnpm icons` into a typed list (45 names). Inline SVG: main lines `currentColor`, detail `--icon-accent` (lime on dark, Suatu green on light), stroke kept at 2 px at every size. lucide was removed; a test fails if any icon library is installed.

### D35. Customer app follows the phone's appearance

Dark green when the phone is in Dark mode, light (mist) when it's in Light mode, as §9 says ("follows system setting"). Staff screen is always light. On a phone in Light mode the customer app is light, so most people will first see the light version.

### D36. Light theme "sunken" colour lightened: #DCEBE2 → #E4F0E9

Suatu green text (`#1E7A4F`, kept per the brand rules) was 4.3:1 on it; now 4.54:1. Found by the new brand contrast test.

### D37. "Powered by behappy" placement (spec §5)

Dark badge in the customer app footer (every customer screen, including Account), light badge at the bottom of the staff screen. behappy is the company that makes the app; it is platform branding, the same in every store's app (`src/lib/platform.ts`).

## 2026-10-28 — Milestone 4, part 2

### D38. Tests use their own store and clean up after themselves

A second Supabase stack would cost ~1.5 GB more memory on an already busy laptop. Instead every test run works in a store called `suatu-test` (same look as Suatu) plus throwaway `test-…` stores, and a global teardown deletes everything tests created: their customers, logins, points, codes, sessions, logs and emails to `@example.test`. Customers who also belong to a real store are never touched. Result: the real Suatu data in Supabase Studio only ever holds what people did by hand.

### D39. "Last visit" is formatted on the server

Found by the new no-console-errors test: Node and Safari word dates differently ("Oct 28, 2026 at 2:20 PM" vs "…, 2:20 PM"), which broke hydration. The server now formats it once, in the store's time zone, and the phone just shows the text (also in the 3-second updates).

### D40. Translations are compiled at build time

`next-intl`'s `precompile` option: phones don't download the message parser. Customer home JavaScript went from just over to 142 KB gzipped (budget 150 KB). Little headroom is left: keep an eye on it in M5.

### D41. Dev home is a "how to test" page

Rewritten at the owner's request: open on two phones (or two tabs) → pick a part (Cashier with `0000/0000`, Customer with your own details) → try the whole flow. The demo customer Andrei is no longer listed (`pnpm db:seed-demo` still adds him on request).

## 2026-10-28 — Milestone 5

### D42. Hand-written service worker instead of Serwist

Serwist doesn't fit this Next.js version's Turbopack build well, and the job is small: `public/sw.js` (~40 lines) sends every page request to the network and only falls back to a cached, self-contained offline page (`/s/<store>/offline`). Nothing else is cached, so customers never see a stale balance or an old app version. `/sw.js` is served with `no-cache`.

### D43. Delete my account = anonymize, then remove the login

`anonymize_customer()` clears name, phone and email in one transaction (status `deleted`), cancels pending codes and records the event; the points ledger, redemptions and consent records stay, pointing at the anonymous row (spec §4.4). Then the Supabase Auth user is deleted, which ends every session. The phone number is free for a new sign-up.

### D44. Signed-in screens share a tab bar (route group `(app)`)

Home · Rewards · History · Account. Log out moved from Home to Account. Pages still check the session themselves.

### D45. Next.js dev-tools button hidden (`devIndicators: false`)

On phones it sat on top of the tab bar's Home button. Compile and runtime errors still pop up in development.

### D46. Tests block service workers, except the offline test

They'd only add noise elsewhere, and Playwright's WebKit can't run service workers (the iPhone profiles reported it as an error). The offline test runs in Chromium with the worker allowed.

### D47. HTTPS on phones with mkcert (`pnpm dev:cert`)

Replaces D11's plan. `pnpm dev:cert` makes a certificate for localhost and the laptop's Wi-Fi address; `pnpm dev:lan` then serves HTTPS. Each phone installs the laptop's certificate authority once (download link and steps on the dev home; only the public certificate is served, development only). Needed for the service worker, "Install app" on Android and keeping the screen awake on the code screen.

### D48. Service worker scope is the store's root, Home included

It was registered for `/s/suatu/` (trailing slash), which covers every screen except Home itself (`/s/suatu`). Found by the offline test once HTTPS was on; now `/s/suatu`.

### D49. Clock-jumping tests tolerate dev live-reload

Jumping Playwright's fake clock 15 minutes can make the dev server's live-reload reconnect and reload the page, restarting the app's timers. `fastForwardUntil()` jumps again in that case (each jump is a full interval, so the test still proves "not before 15 minutes"). Production builds have no live-reload.

### D50. The HTTPS dev server trusts its own certificate

After a server action redirects (log in, sign up, Add visit), Next.js fetches the next page from itself over HTTPS. Node ignores the Mac's trust store by default, so that fetch failed and the browser could end on a blank page. `pnpm dev:lan` now starts Next with `NODE_OPTIONS=--use-system-ca` (reaches Next's worker processes; uses the CA `mkcert -install` added) plus `NODE_EXTRA_CA_CERTS`.

## 2026-10-29 — Milestone 6

### D51. Void is a reversal, for your own entries, within 10 minutes

`void_transaction()` (one transaction, membership row locked) adds a `reversal` row (−5) pointing at the original; a unique index allows only one reversal per entry. Refused when: not the cashier's own entry, older than 10 minutes, already voided, from another store, or the points were already spent on a reward (balance never below zero; the owner adjusts in M7). Visit count goes back down too.

### D52. Recent entries are per cashier

The counter shows the signed-in cashier's last 15 visits (newest first): time in the store's time zone, the customer as "Andrei P." or "••• 0142" (never the full number), +5, and Void while allowed. The Void button hides itself when its 10 minutes run out; the server checks again anyway. Add visit and Void refresh the list (`refresh()`).

### D53. Screenshot tolerance 0.2%

At 1% a whole changed section of a tall tablet page passed unnoticed. 0.2% still matches the same screen run after run.

## 2026-10-29 — Milestone 7

### D54. The dashboard uses staff accounts; managers only

The owner dashboard (`/dashboard/<store>`) logs in with the same user name + password as the counter screen and shares its session (same cookie, same 15-minute idle logout). Only the `manager` role gets in: a cashier is refused at the dashboard login, and a cashier session that opens a dashboard URL is sent to the login with a notice. A separate "owner" account type (`store_members`, §7) isn't built yet: in this demo the manager is the owner (D2). Managers see an "Owner dashboard" link on the counter screen.

### D55. Temporary passwords are replaced at the next login

A password the owner types (adding someone, resetting a password) is temporary (`must_change_password`): the next login asks for the temporary password plus a new one, and only then starts the session. In production the development password `0000` is treated the same way, so §6's "force a real password on first login" now happens in the login form instead of a plain refusal. New staff passwords follow the customer rules (8–64 characters, not a common password), are never the user name, and can't stay the same. Resetting or turning someone off ends their open sessions at once.

### D56. Contact details are masked everywhere in the dashboard and CSV

Phones show as "••• 0142" and emails as "m•••@gmail.com" in lists, customer pages and the CSV export (§14 "visible (masked)"). The owner can still find someone by the last digits of their number or by name. Full details stay with the customer (their own Account page and data download). Every CSV export is written to the audit log; cells that start like a formula get a leading `'` (CSV injection).

### D57. Owner adjustments: a note, both directions, never below zero

`adjust_points()` adds or removes up to 10,000 points with a required note (3–200 characters) the customer sees in their History. It locks the membership row, refuses to go below zero, and uses an idempotency key so a double tap adjusts once. Audited.

### D58. "Release number" = close the account that holds the number (D4)

From a customer's page a manager can release the phone number (with a reason and a confirmation tick): the account is anonymized exactly like "Delete my account" (D43, history kept, Auth login removed) and the number can sign up fresh. This also cleans up a number a cashier mistyped. The reason goes to the audit log. ⚖ Real launches need SMS verification instead (D4).

### D59. Offer pictures: private bucket, served by the app, shrunk in the browser

Offers live in an `offers` table (title, details, optional start/end day in the store's calendar, on/off). Pictures go to a private Supabase Storage bucket (`offer-images`, JPG/PNG/WebP, 5 MB) and reach phones through `/api/s/<store>/offers/<id>/image`, because phones can't reach the laptop's storage address and production shouldn't expose it either. The file type is checked from its first bytes, not its name. The dashboard shrinks photos to 1600 px JPEG in the browser before upload (phone photos are ~4 MB); server actions accept up to 6 MB for when it can't.

### D60. Overview numbers are counted in Postgres

`dashboard_overview()` counts in the store's time zone: members (not deleted), visits today / 7 / 30 days (voided visits don't count), returning customers (came on 2+ different days in the last 30 days, out of everyone who came), rewards redeemed (all time and last 30 days). One query, tested against fixed data.

### D61. Branding is shown, not edited, in Settings

Settings edits points per visit (applies to new visits; balances stay). Reward costs are edited on Rewards. The look (logo, colours, fonts) is previewed but stays in code (`src/brands/<store>.ts`, D33), because behappy sets it up per store and it must stay reusable for other apps.

### D62. The counter sign is the notice at collection (D5)

`/dashboard/<store>/sign` prints a letter-size "Join Suatu Rewards" sign: the cheapest reward, a QR code to sign-up, three steps, and the notice that giving a number at the register saves it with points before sign-up, with the program-terms link. In development the QR uses the laptop's Wi-Fi address, so a phone can scan it.

### D63. `pnpm dev:share`: a temporary public link (dev only)

For a tester outside the Wi-Fi, `pnpm dev:share` runs the app plus a Cloudflare quick tunnel (`https://<random>.trycloudflare.com`). The link changes every run and dies with Ctrl+C. Only while it runs does the dev server accept that address (`DEV_SHARE=1` adds `*.trycloudflare.com` to `allowedDevOrigins` and the server-action origins). It is the development build with the `0000` login, so it's for short, supervised sessions only.
