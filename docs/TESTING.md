# Testing

## Automated

| Command         | What                                                                              | Where                     |
| --------------- | --------------------------------------------------------------------------------- | ------------------------- |
| `pnpm test`     | Unit tests (Vitest); DB-function tests join in M3                                 | `tests/unit`, `tests/db`  |
| `pnpm e2e`      | End-to-end + accessibility (Playwright + axe) on every device project             | `tests/e2e`, `tests/a11y` |
| `pnpm check`    | Lint + type-check + format check + unit tests                                     | —                         |
| `pnpm e2e:prod` | Builds the app for production and proves its guards (0000 refused, dev home gone) | `tests/prod`              |

`pnpm e2e` starts the dev server itself (or reuses one already running on port 3000). First time only: `pnpm e2e:install` downloads the browsers. Locally it runs 4 browsers at a time with 10 s per check; the full run takes about 7 minutes on this laptop. If many tests time out, check what else is using the CPU (a second Supabase project in Docker is the usual suspect).

### Test data

Tests never use the real Suatu store. They run in their own store (`suatu-test`) and delete everything they created when the run ends (`tests/support/testStore.ts`, DECISIONS D38). Don't run `pnpm test` and `pnpm e2e` at the same time: whichever finishes first cleans up the other's data.

### Device projects (spec §10)

iPhone SE (320 px, WebKit) · iPhone 15 Pro (WebKit) · Pixel 7 (Chromium) · Galaxy S9+ (320 px, Chromium) · iPad (gen 7) portrait and landscape (WebKit) · Desktop Chrome · Desktop Safari · Desktop Firefox.

Samsung Internet can't be driven by Playwright → manual checklist below.

### Every screen gets

- Loads and shows its main content.
- No horizontal scroll (checked at 320 px on iPhone SE and Galaxy S9+).
- axe: zero WCAG 2.2 AA violations.

## Status by milestone

| Milestone | Automated tests                                                                                                                                                                                                                                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1        | `storeUrl` unit tests (5); dev home e2e + axe + no-overflow on all 8 device projects (24 tests)                                                                                                                                                                                                                                                 |
| M2        | Unit 28 (incl. 5 from M1) · DB 11 (throttle functions, sign-up function, RLS, append-only consents) · e2e + a11y 45 per device × 8 projects = 360 · production build 2                                                                                                                                                                          |
| M3        | Unit 39 · DB 26 (points engine: 20 → 100 → redeem → 0, 105 → 5, idempotency, 10 parallel taps, concurrent cashiers, claim keeps points, daily cap, append-only ledger, code expiry/reuse/other store) · e2e + a11y 53 per device × 8 = 424 (full §0 golden path on every device) · production build 2                                           |
| M4        | Unit + brand 73 · DB 26 · e2e + a11y 62 per device × 9 = 558 (incl. dark mode, no console errors in another time zone, branding) · visual 54 (12 screens × 6 devices… light and dark) · production 4 (guards + performance)                                                                                                                     |
| M5        | e2e + a11y 75 per device × 9 (tab bar, rewards, history, edit details, email change, offer-email consent, data export, delete account, offline page, install helper, service worker offline in Chromium) · visual 66 · production 4 (customer home JS 143 KB)                                                                                   |
| M6        | DB 32 (6 new: Void rules) · e2e + a11y 79 per device × 9 = 711 (705 run, 6 offline-only skips) · visual 66 at 0.2% tolerance                                                                                                                                                                                                                    |
| M7        | Unit + DB 90 (adjust_points, dashboard_overview, CSV, masking, staff passwords, image types) · e2e + a11y 96 per device × 9 = 864 (858 run, 6 offline-only skips): dashboard access, masked customers, adjust, release, CSV, rewards, offers with picture, staff first login, settings, sign · visual 66 · production 4 (0000 must be replaced) |

### §4.3b coverage (M2)

| Case                                                                                                               | Where                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 7 rejected, 8 / 64 accepted, 65 rejected                                                                           | `tests/unit/password.test.ts`, `tests/e2e/passwords.spec.ts`                                                                       |
| Spaces, emoji, diacritics; leading/trailing spaces kept                                                            | both                                                                                                                               |
| `password123`, phone number, email as password rejected                                                            | both                                                                                                                               |
| Show/hide keeps cursor; copy/cut blocked; paste allowed                                                            | `passwords.spec.ts`                                                                                                                |
| Generic error; 5 wrong → locked 15 min; right password refused while locked; unlock after time (DB clock)          | `passwords.spec.ts`, `tests/db/accounts.test.ts`                                                                                   |
| Password not in HTML, URL, storage, cookies or responses                                                           | `passwords.spec.ts`                                                                                                                |
| Password not in server logs                                                                                        | checked by scanning the dev server log after the full run (0 hits). Automated in CI in M9, where the test owns the server's output |
| Change password needs the current one; other devices signed out                                                    | `passwords.spec.ts`                                                                                                                |
| Reset link works once, expires at 60 min, old password stops working                                               | `passwords.spec.ts`                                                                                                                |
| Staff 0000/0000 works in dev, refused in production; 5 wrong → lock; idle logout at 15 min (server + screen timer) | `staff.spec.ts`, `tests/prod`, `tests/unit/staffPasswordPolicy.test.ts`                                                            |
| Redemption code: 6 digits, expires at 5:00, works once, other store refused                                        | `tests/db/points.test.ts` (server expiry moved into the past), `tests/e2e/redemption.spec.ts` (countdown with Playwright's clock)  |
| Redemption code: 5 wrong → locked, unlocks after 15 min; can't be selected/copied                                  | `tests/e2e/redemption.spec.ts`                                                                                                     |

"Fake clock": lock and link expiry are moved into the past in the database; the screen's idle timer uses Playwright's clock.

## Performance (M4, production build, emulated mid-range phone on slow 4G)

| Screen        | LCP                          | CLS   | Initial JS (gzip) |
| ------------- | ---------------------------- | ----- | ----------------- |
| Log in        | 0.68 s                       | 0     | 143 KB            |
| Customer home | 0.22 s (shared files cached) | 0     | 142 KB            |
| Budget (§10)  | < 2.5 s                      | < 0.1 | < 150 KB          |

INP (tap responsiveness) needs a real phone: on the manual checklist. Lighthouse CI runs in M9.

## Manual checklist

Fill in as each milestone ships. ✅ pass · ❌ fail · — not yet applicable.

| Check                                                              | iPhone Safari | iPhone home-screen | Android Chrome | Samsung Internet | Notes   |
| ------------------------------------------------------------------ | ------------- | ------------------ | -------------- | ---------------- | ------- |
| M1: dev home loads over Wi-Fi                                      | ✅            | —                  |                |                  |         |
| M2: sign up, log out, log in                                       |               | —                  |                |                  |         |
| M2: forgot password via Mailpit                                    |               | —                  |                |                  |         |
| M6: Void a wrong entry at the counter; customer's phone shows it   |               | —                  |                |                  |         |
| M7: dashboard on laptop and phone; adjust; add staff + first login |               | —                  |                |                  |         |
| M7: offer with a phone photo shows on the customer home            |               |                    |                |                  |         |
| M7: print the counter sign and scan its QR code                    |               | —                  |                |                  |         |
| M3: §0 golden path by hand (phone + tablet)                        |               | —                  |                |                  |         |
| M2: staff 0000 on tablet/phone                                     |               | —                  |                |                  |         |
| VoiceOver / TalkBack pass                                          |               |                    |                |                  | from M2 |
| Landscape                                                          |               |                    |                |                  |         |
| Dark / light                                                       |               |                    |                |                  |         |
| 200% text size                                                     |               |                    |                |                  |         |
| Slow 3G                                                            |               |                    |                |                  |         |
| Offline page                                                       |               |                    |                |                  | from M5 |
| Airplane mode mid-action                                           |               |                    |                |                  | from M3 |

## HTTPS (since M5)

Once `pnpm dev:cert` has made `certs/dev-cert.pem`, `pnpm dev:lan` serves **https://** and the tests use it too (`ignoreHTTPSErrors`; the offline test also tells Chrome to accept the local certificate). Without the certificate everything runs on plain http as before.

## Testing on your phone

1. Phone and laptop on the **same Wi-Fi**.
2. On the laptop: `pnpm dev:lan`. It prints an address like `http://10.0.0.157:3000`.
3. On the phone: scan the QR code on the dev home, or type that address.

If it doesn't load: check the Mac's firewall (System Settings → Network → Firewall) allows incoming connections for `node`, and that the phone isn't on a guest network that isolates devices.

HTTPS on the phone (needed for the PWA in Milestone 5) gets its own steps for iPhone and Android when it's set up.
