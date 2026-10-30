# Testing

## Automated

| Command           | What                                                                                                                      | Where                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `pnpm test`       | Unit tests (Vitest); DB-function tests join in M3                                                                         | `tests/unit`, `tests/db`  |
| `pnpm e2e`        | End-to-end + accessibility (Playwright + axe) on every device project                                                     | `tests/e2e`, `tests/a11y` |
| `pnpm check`      | Lint + type-check + format check + unit tests                                                                             | —                         |
| `pnpm e2e:prod`   | Builds the app for production and proves its guards (0000 refused, dev home gone)                                         | `tests/prod`              |
| `pnpm e2e:visual` | Screenshot comparisons of key screens (macOS only: fonts render differently on Linux)                                     | `tests/visual`            |
| `pnpm lighthouse` | Production build scored by Lighthouse as a mid-range phone on slow 4G: speed ≥ 90, accessibility 100, best practices ≥ 95 | `lighthouserc.cjs`        |

**Everything at once, on the laptop:** `pnpm test:all` runs `pnpm check`, the browser tests on all 9 devices, the production guards and Lighthouse, about 20–30 minutes. This is the normal way to run the full suite: it costs no GitHub Actions minutes (the free plan has 2,000 a month and one full CI run used about 200).

**CI:** `.github/workflows/ci.yml` runs the quick checks on every push and pull request (no secrets, lint, types, formatting, unit and database tests) against a fresh local Supabase inside GitHub's runner. The 9-device browser tests and production build with Lighthouse run only when started by hand: GitHub → Actions → CI → Run workflow. Do that before merging something big.

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

| Milestone | Automated tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1        | `storeUrl` unit tests (5); dev home e2e + axe + no-overflow on all 8 device projects (24 tests)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| M2        | Unit 28 (incl. 5 from M1) · DB 11 (throttle functions, sign-up function, RLS, append-only consents) · e2e + a11y 45 per device × 8 projects = 360 · production build 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| M3        | Unit 39 · DB 26 (points engine: 20 → 100 → redeem → 0, 105 → 5, idempotency, 10 parallel taps, concurrent cashiers, claim keeps points, daily cap, append-only ledger, code expiry/reuse/other store) · e2e + a11y 53 per device × 8 = 424 (full §0 golden path on every device) · production build 2                                                                                                                                                                                                                                                                                                                                      |
| M4        | Unit + brand 73 · DB 26 · e2e + a11y 62 per device × 9 = 558 (incl. dark mode, no console errors in another time zone, branding) · visual 54 (12 screens × 6 devices… light and dark) · production 4 (guards + performance)                                                                                                                                                                                                                                                                                                                                                                                                                |
| M5        | e2e + a11y 75 per device × 9 (tab bar, rewards, history, edit details, email change, offer-email consent, data export, delete account, offline page, install helper, service worker offline in Chromium) · visual 66 · production 4 (customer home JS 143 KB)                                                                                                                                                                                                                                                                                                                                                                              |
| M6        | DB 32 (6 new: Void rules) · e2e + a11y 79 per device × 9 = 711 (705 run, 6 offline-only skips) · visual 66 at 0.2% tolerance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| M7        | Unit + DB 90 (adjust_points, dashboard_overview, CSV, masking, staff passwords, image types) · e2e + a11y 96 per device × 9 = 864 (858 run, 6 offline-only skips): dashboard access, masked customers, adjust, release, CSV, rewards, offers with picture, staff first login, settings, sign · visual 66 · production 4 (0000 must be replaced)                                                                                                                                                                                                                                                                                            |
| M8        | Unit + DB 114 (create_store, store list numbers, admin tables closed to browsers, CSP and headers, store-from-address, language picking, every `ro.json` text valid with the English placeholders, PII redaction in logs) · e2e + a11y 109 per device × 9 = 981 (975 run, 6 offline-only skips): admin access, add a store + owner first login, Romanian store, pause / resume, form errors, audit log, security headers on every page, no CSP violations across customer and dashboard screens, store header can't be forged · axe on admin and Romanian screens · production 6 (admin 0000 must be replaced, CSP lets the app run, HSTS) |
| M9        | Clean clone (fresh copy, its own database): all migrations + seed apply, `pnpm check` 114 green, e2e 217 on two devices · Unit + DB 120 (+ retention job, emailed links use APP_URL in production) · Lighthouse 6 public screens: speed 92–94, accessibility 100, best practices 100 · CI workflow checked with actionlint (runs once the repository is on GitHub)                                                                                                                                                                                                                                                                         |

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

Things the automated tests can't prove: real phones, real fingers, real screen readers, real networks. **Only a person fills this in**: ✅ pass · ❌ fail (write what happened in Notes) · — doesn't apply. Empty means not tried yet.

Setup: laptop runs `pnpm dev:lan`; phones on the same Wi-Fi open the address it prints (https://10.0.0.157:3000 on this laptop). Counter = a second phone or tablet. "Home-screen" = the app added to the home screen (Account → Add to Home Screen).

| #   | Check                                                                                                              | iPhone Safari | iPhone home-screen | Android Chrome | Samsung Internet | Notes |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------ | -------------- | ---------------- | ----- |
| 1   | Dev home loads over Wi-Fi                                                                                          | ✅            | —                  |                |                  |       |
| 2   | **§0 golden path:** sign up → counter adds visits → phone updates within ~3 s → 100 → Redeem → code at counter → 0 |               |                    |                |                  |       |
| 3   | Counter types a new number first, then that person signs up and sees the points                                    |               | —                  |                |                  |       |
| 4   | Log out, log in; wrong password 5 times → locked message                                                           |               |                    |                |                  |       |
| 5   | Forgot password → email in Mailpit (laptop) → link opened on the phone → new password works                        |               | —                  |                |                  |       |
| 6   | Account: edit name, change password, download my data, delete account                                              |               |                    |                |                  |       |
| 7   | Counter: Void a wrong entry within 10 minutes; the customer's phone shows it                                       |               | —                  |                |                  |       |
| 8   | Counter `0000` on a tablet, portrait and landscape; logs out after 15 minutes idle                                 |               | —                  |                |                  |       |
| 9   | Dashboard on laptop and phone: search a customer, adjust points with a note, add a cashier + their first login     |               | —                  |                |                  |       |
| 10  | Offer with a photo taken on the phone shows on the customer home                                                   |               |                    |                |                  |       |
| 11  | Print the counter sign; scan its QR code with the phone camera → sign-up opens                                     |               | —                  |                |                  |       |
| 12  | Admin: add a store, its owner logs in and chooses a password, pause / switch back on                               |               | —                  |                |                  |       |
| 13  | A Romanian store's sign-up reads naturally (native speaker)                                                        |               | —                  |                |                  |       |
| 14  | Add to Home Screen: opens full screen with the Suatu icon; airplane mode → offline page                            | —             |                    |                |                  |       |
| 15  | VoiceOver (iPhone) / TalkBack (Android): sign up and read the points without looking                               |               |                    |                |                  |       |
| 16  | Phone text size at maximum (200%): nothing cut off or overlapping on sign-up, home, counter                        |               |                    |                |                  |       |
| 17  | Dark and light phone setting: customer app follows it; counter and dashboard stay light                            |               |                    |                |                  |       |
| 18  | Slow connection (or one bar of signal): screens still usable, buttons show "…ing" while waiting                    |               |                    |                |                  |       |
| 19  | Airplane mode in the middle of Redeem or Add visit: a clear message, nothing doubled after reconnecting            |               |                    |                |                  |       |
| 20  | Taps feel instant (INP): tab bar, Add visit, Redeem                                                                |               |                    |                |                  |       |

## HTTPS (since M5)

Once `pnpm dev:cert` has made `certs/dev-cert.pem`, `pnpm dev:lan` serves **https://** and the tests use it too (`ignoreHTTPSErrors`; the offline test also tells Chrome to accept the local certificate). Without the certificate everything runs on plain http as before.

## Testing on your phone

1. Phone and laptop on the **same Wi-Fi**.
2. On the laptop: `pnpm dev:lan`. It prints an address like `http://10.0.0.157:3000`.
3. On the phone: scan the QR code on the dev home, or type that address.

If it doesn't load: check the Mac's firewall (System Settings → Network → Firewall) allows incoming connections for `node`, and that the phone isn't on a guest network that isolates devices.

HTTPS on the phone: see "HTTPS (since M5)" above and the README.
