# MVP Spec — "Suatu Rewards" (gas station loyalty web app) · v3

> **How to use this file:** This folder (`~/Desktop/APP`) is the project. Open it in VS Code → View → Terminal → run `claude` → paste the kickoff prompt at the bottom. Claude Code treats this file as the source of truth and records any change of decision in `docs/DECISIONS.md` and here.
>
> Older versions are kept as `MVP_SPEC_v1_backup.md` and `MVP_SPEC_v2_backup.md` for reference only. **v3 wins wherever they differ.**

> **Changes agreed since v3 (2026-10-28)** — details and reasons in `docs/DECISIONS.md`; these win over the text below:
> - **Demo, not launch (D1):** an internal MVP example with fictional data; legal pages are short demo versions labelled "Demo — not for real customers".
> - **`0000 / 0000` everywhere non-customer (D2):** one dev-only account logs in to the staff screen, owner dashboard **and `/admin`** (user name `0000`, password `0000`). Refused in production.
> - **No email on any log-in screen (D3):** email is asked only at sign-up (required `*`); "Forgot password?" asks for the phone number and emails the address on file.
> - **Manager "release number" action (D4)** and **unclaimed accounts deleted after 12 months idle (D5).**
> - **Fonts: Barlow + Barlow Condensed (D6)**; **contrast fixes to §9 (D7)**; **local Supabase on ports 55321–55324 (D8)**.
> - **M2 (D16–D23):** passwords pre-hashed for Supabase's 72-byte limit; login limits in our own table; staff lockout via that table instead of `staff` columns; legal documents as versioned Markdown files instead of a `legal_documents` table; dark-theme error red `#f2836f`; HTTPS on the phone moved to M5.
> - **M3 (D24–D31):** points move when the cashier confirms the code; wrong codes throttled per staff member; sign-up's claim of an unclaimed account replaces a separate `link_customer_on_signup`; void/adjust functions ship with their screens (M6/M7).
> - **M4 (D32–D37):** Space Grotesk + Inter; store look in `src/brands/<slug>.ts` with files copied from `brand/` to `public/` by `pnpm brand:sync`; `<Icon>` from the custom set; customer app follows the phone's light/dark setting; light "sunken" shade `#E4F0E9` for contrast.
> - **M4 part 2 (D38–D41):** tests run in their own `suatu-test` store and clean up after themselves; visit times formatted on the server; translations precompiled (customer home JS 142 KB); dev home rewritten as a two-part "how to test" guide.
> - **M5 (D42–D47):** hand-written service worker (offline page only) instead of Serwist; delete account anonymizes and keeps the ledger; tab bar on signed-in screens (Log out moved to Account); HTTPS on phones via `pnpm dev:cert` (mkcert).
> - **M6 (D51–D53):** Void = reversal row, own entries, 10 minutes, refused if the points were already redeemed; recent entries per cashier with masked phones.
> - **M7 (D54–D63):** dashboard = staff login, managers only; temporary passwords replaced at next login (also `0000` in production); phones and emails masked in dashboard and CSV; adjust with a note, never below zero; "release number" closes the account holding it; offer pictures in a private bucket served by the app; branding previewed, not edited; counter sign = notice at collection; `pnpm dev:share` temporary public link.
> - **M8 (D64–D67):** `/admin` uses behappy's own admin accounts (`0000`/`0000` in dev), not store staff; admin lists stores, adds a store with its first owner, pauses/resumes, manages owners, reads the audit log; each store's screens follow its locale (`ro.json` is a draft for native review); CSP with nonces + fixed security headers; new limits on sign-ups per IP and reset emails per phone; mail-server errors masked in logs.
> - **M9 (D68–D72):** clean clone starts with `pnpm db:start`; Lighthouse CI on public screens + GitHub Actions workflow; nightly retention job for idle unclaimed accounts (D5); production email links always from `APP_URL`, SMTP login for a real provider; `pnpm admin:create` for the first admin; deploy notes in `docs/DEPLOY.md`.
> - **After M9 (D74–D76):** Suatu "complex turistic" logo, centred screen headers; CI runs all 9 devices on pull requests; Home polls every 3 s, slowing to 15 s after 2 quiet minutes. Customer app has depth: floating cards and tab bar, buttons that press in (D77).

---

## 0. The golden path (the test that must always work)

**Store:** **Suatu** — an independent gas station with a shop. Reward mode **visits**: **+5 points per visit**. Reward: **"Free coffee" = 100 points** (20 visits).

| # | I do | I must see |
|---|---|---|
| 1 | On my phone, open the **customer app** → **Create account** → enter phone, first name, last name, email, password → accept terms | Account created, logged in, home screen shows **0 / 100 points** |
| 2 | Log out, then **log in with phone number + password** | Logged in, same account, 0 / 100 |
| 3 | On the **counter tablet** (also works on a phone or laptop), open the **staff screen** → log in with staff ID **`0000`**, password **`0000`** — the cashier/manager account (development only, see §6) | Big phone-number field and an **Add visit (+5)** button, usable one-handed |
| 4 | Type the customer's phone (any format) → **Add visit** | Banner: **"+5 points · Andrei P. · 5 / 100 · 19 more visits to a Free coffee"** |
| 5 | Look at the customer app on my phone (no refresh) | Updates within ~3 s to **5 / 100**, progress bar at 5% |
| 6 | Repeat the same number 19 more times, quickly | **Every entry adds +5.** 10, 15 … 100 |
| 7 | At 100 | Customer app: **"Free coffee unlocked"** + **Redeem** button. Staff banner: "Reward available" |
| 8 | Customer taps **Redeem** | Large **6-digit code**, valid 5 minutes, with a countdown |
| 9 | Staff types the code → **Redeem** | "Free coffee redeemed for ••• 0142". Customer app shows **0 / 100** |
| 10 | Staff enters **any phone number that has never been seen before** (e.g. made-up `305-555-0199`) | A **new customer account is created instantly** for that number with **5 / 100** — no error, no extra step. Banner: "New customer · +5 points · 5 / 100" |
| 11 | Later, someone signs up in the customer app with that same number | They take over that account and see the points already earned (5 / 100), plus their name/email/password |

Non-negotiable rules behind this test:
- Every **new** staff submission adds +5. Only the *same* submission arriving twice (double tap, network retry) is ignored — via an idempotency key generated per form render.
- `(954) 555-0142`, `954-555-0142`, `9545550142`, `+1 954 555 0142` = **same customer** (stored as E.164).
- **Any valid-format phone number creates a customer account automatically** on first entry, even if it's fictional (555 numbers, made-up numbers). No SMS, no verification, no "customer not found" error. Testers (and AI test scripts) can create accounts with any data.
- **`0000` is the only staff account** in development: it's the cashier/manager account. Every other phone/person is a customer.
- Points above a reward's cost carry over (105 − 100 = 5).
- The balance shown anywhere always equals the sum of the points ledger.

---

## 1. Working rules for Claude Code

1. **Plan first.** Read the whole spec. Reply with (a) plan per milestone, (b) questions/concerns, (c) tools to install — check first what's installed on this **MacBook Pro (Apple Silicon, macOS)** and give Homebrew commands. Wait for my "go".
2. **One milestone at a time** (§12). After each: lint, type-check, tests, git commit, then tell me in plain English **exactly what to open and tap** — on laptop and on my phone. Stop and wait for "next".
3. **100% local.** No cloud accounts in the MVP. Local Supabase via Docker.
4. **Readable code.** Small files, clear names, folder structure in §5, no business logic in React components, no dead code.
5. **No secrets in git.** `.env.local` ignored; `.env.example` kept current.
6. **No invented claims, stats, testimonials or fake reviews** in the UI. Seed data obviously fictional.
7. **Push back** if anything here is technically or legally a bad idea, and propose the better option before building.
8. **Boring and reliable beats clever.**
9. Keep `README.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/TESTING.md`, `docs/DESIGN.md` updated.

---

## 2. Product summary

One web app, one database, four areas:

| Area | URL | Who | Typical device |
|---|---|---|---|
| **Customer app** (installable PWA) | `/s/suatu` | Drivers / shop customers | Their phone (iPhone or Android) |
| **Staff screen** | `/staff/suatu` | Cashier | Store tablet / phone / counter PC |
| **Owner dashboard** | `/dashboard/suatu` | Station owner | Laptop or phone |
| **Admin** | `/admin` | Me | Laptop |

- Customers **create an account** (phone, first name, last name, email, password) and **log in with phone + password**.
- Staff earn points for customers by typing the customer's phone number. Works with cash or card, alongside any register. **No POS integration in the MVP.**
- Built multi-store from day one (Suatu is store #1), so other businesses can be added later without a rewrite.
- Market: Fort Lauderdale, FL (USD, English, `America/New_York`). Romania later (RON, Romanian, GDPR) without a rewrite.

---

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (latest stable, App Router) + TypeScript strict** | One codebase for all four areas; easy Vercel deploy later |
| Package manager | **pnpm** | |
| DB / Auth / Storage | **Supabase** local via **Supabase CLI + Docker Desktop** | Postgres + RLS; **Supabase Auth phone+password** for customers; migrations in repo |
| Data access | **Server-side only** (`@supabase/ssr`, generated types). The browser talks only to Next.js | So the app works on my phone over Wi-Fi (`localhost:54321` doesn't exist on the phone) |
| Points logic | **Postgres functions in one transaction with row locking** | Correct balances under double taps / two cashiers |
| Validation | **Zod** everywhere (shared client + server schemas) | |
| UI | **Tailwind CSS v4** + a small hand-built component set (Radix primitives where accessibility needs them: dialog, toast, switch) | Avoid the default "shadcn template" look — see §9 |
| Icons | **Custom Suatu icon set** in `brand/suatu/icons/` (45 two-tone SVGs + sprite). **No icon library** (no lucide). Turn them into a typed `<Icon name="…" />` React component (inline SVG, `currentColor` + `--icon-accent`) | Matches the logo; avoids the generic look |
| Phone | `libphonenumber-js` → E.164 | |
| Passwords | Supabase Auth (bcrypt) for customers; **argon2id** for staff passwords | |
| i18n | **next-intl** (en; `ro.json` skeleton) | |
| Time | store timezone; `date-fns` + `@date-fns/tz` | |
| Live updates | Poll a Next.js route **every 3 s while visible**, pause when hidden | Works over Wi-Fi with zero config |
| PWA | Per-store manifest + service worker (**Serwist**), offline fallback page | |
| Email | `EmailSender` interface: local **Mailpit** (bundled with Supabase CLI); Resend adapter later | Password reset emails |
| SMS | `SmsSender` interface, **console only**. **No SMS is ever sent in the MVP** | TCPA (§8) |
| Tests | **Vitest** (unit + DB functions against local Supabase), **Playwright** (Chromium + **WebKit** + Firefox, device profiles §10), `@axe-core/playwright` | |
| Quality | ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged; Lighthouse CI on customer app | |
| CI | GitHub Actions | |

---

## 4. Customer accounts

### 4.1 Sign-up form (`/s/suatu/signup`)

| Field | Required | Input attributes | Validation |
|---|---|---|---|
| Phone number | **Yes** | `type="tel"` `inputmode="tel"` `autocomplete="tel"` | **Format check only** (`isPossiblePhoneNumber`, US default, `+40` accepted) so fictional/test numbers like 555 work; normalized to E.164; if the number already exists as an auto-created account (§0 step 10) it is **claimed** instead of rejected; rejected only if it already belongs to a signed-up account |
| First name | **Yes** | `autocomplete="given-name"` `autocapitalize="words"` | 1–50 chars, letters incl. diacritics (ă, â, î, ș, ț, é…), spaces, `-` `'` |
| Last name | **Yes** | `autocomplete="family-name"` | same as first name |
| Email | **Yes** | `type="email"` `inputmode="email"` `autocomplete="email"` `autocapitalize="off"` | valid, lowercased, unique |
| Password | **Yes** | `type="password"` `autocomplete="new-password"` + show/hide toggle | see 4.3 |
| Agree to Program Terms & Privacy Policy | **Yes** (checkbox, unchecked) | links open in a sheet, not a new tab | must be checked |
| "I'm 18 or older" | **Yes** (checkbox) | | must be checked |
| "Send me Suatu offers by email" | No (unchecked by default) | | stored as separate consent with timestamp |

> Email is required because it is the **only way to reset a forgotten password** without SMS. (If I decide later it should be optional, password reset must then go through the owner — record that in DECISIONS.md.)

On submit: create Supabase Auth user (phone + password, phone confirmation **disabled** in MVP because there is no SMS; email stored and marked unverified, with a verification email sent to Mailpit), create the `customers` row, **merge any points already earned on that phone number** (§0 step 10), log in, go to home.

Errors are field-level, plain English, and never reveal whether *another* person's phone/email exists beyond "This phone number already has an account — log in instead".

### 4.2 Log in (`/s/suatu/login`)
- Phone + password (`autocomplete="current-password"`). Optional "Forgot password?" → email reset link (Mailpit locally).
- **Rate limit + lockout:** 5 failed attempts per phone → 15-minute lock with a clear message; also per-IP limits.
- Sessions: secure httpOnly cookies, 30-day "remember me" on phones.
- Generic error: "Phone number or password is incorrect."

### 4.3 Password rules (NIST SP 800-63B style)
- Minimum **8 characters**, maximum 64; spaces and all characters allowed; **paste allowed**; show/hide toggle.
- No forced symbol/uppercase rules. Reject passwords on a common-password list (top 10k bundled) and passwords equal to the phone number or email.
- Never logged, never emailed, never shown in URLs, never sent to analytics.
- **No copying out:** the password can't be copied or cut from the field (block `copy`/`cut`/drag even when the show/hide toggle reveals it). The same applies to the **staff password field**. Pasting **into** password fields stays allowed so password managers work (NIST guidance) — record this in DECISIONS.md.
- Password fields: `autocorrect="off"` `autocapitalize="off"` `spellcheck="false"`; never pre-filled by the app; cleared from memory/state after submit.

### 4.3b QA test cases for passwords & codes (all automated, all device projects)
- 7 chars rejected, 8 accepted, 64 accepted, 65 rejected; spaces, emoji and diacritics allowed; leading/trailing spaces preserved.
- Common password (`password123`), phone number and email as password → rejected with a clear message.
- Show/hide toggle works and keeps cursor position; copy and cut from the field are blocked; paste in works.
- Wrong password → generic error; 5 wrong → locked 15 min, correct password also refused while locked; unlock after time passes (fake clock).
- Password never appears in page HTML, URL, local/session storage, network logs or server logs (test scans logs).
- Change password requires the current one; old sessions on other devices are signed out.
- Forgot password: link works once, expires in 60 min, old password stops working.
- Redemption code: 6 digits, expires at 5:00 (fake clock), works once, wrong code 5× → locked, code from another customer/store rejected, code text can't be selected/copied on the customer screen.
- Staff `0000/0000`: works in development, refused in production build, lockout after 5 wrong tries, idle logout at 15 min.

### 4.4 Account page
Edit name/email, change password, marketing consent toggle, **download my data (JSON)**, **delete my account** (confirm with password; anonymizes PII, keeps ledger rows with an anonymized reference), log out.

---

## 5. Project structure

```
APP/
├─ MVP_SPEC.md  README.md
├─ docs/ (ARCHITECTURE, DECISIONS, TESTING, DESIGN).md
├─ brand/behappy/ (company "Powered by behappy" badges: use powered-by-dark.svg in the customer app footer and Account page, powered-by-light.svg on the staff screen)
├─ brand/suatu/icons/ (45 custom UI icons + README: colors, sizes, which icon goes on which screen)
├─ brand/suatu/ (Suatu logo kit, Direction C "The Road": SVG + PNG + favicon.ico + manifest snippet; README says which file goes where. Ignore brand/_old-direction-a/)
├─ legal/ (privacy-policy.md, terms-of-service.md = base documents; app versions created from them)
├─ .vscode/ (extensions.json, settings.json, launch.json)
├─ supabase/ (config.toml, migrations/, seed.sql)
├─ public/ (stores/suatu/ icons, splash images)
├─ src/
│  ├─ app/
│  │  ├─ page.tsx               # DEV HOME (development only): links + demo logins
│  │  ├─ s/[storeSlug]/         # customer app: home, rewards, history, account, signup, login
│  │  ├─ staff/[storeSlug]/     # staff screen
│  │  ├─ dashboard/[storeSlug]/ # owner dashboard
│  │  ├─ admin/
│  │  ├─ legal/                 # program-terms, privacy, terms (per store)
│  │  └─ api/                   # status poll, manifest, cron
│  ├─ components/ (ui/ primitives, feature folders)
│  ├─ server/ (points, rewards, offers, customers, auth, staff, stores, exports, automations, integrations/)
│  ├─ lib/ (supabase server client, phone, money, time, rate-limit, storeUrl, password)
│  ├─ styles/ (tokens.css — design tokens from §9)
│  ├─ messaging/  messages/ (en.json, ro.json)  types/
└─ tests/ (unit/, db/, e2e/, a11y/)
```

Always build URLs with `storeUrl(slug, path)` so subdomains later only need middleware.

---

## 6. Staff accounts

- Staff log in at `/staff/suatu` with **Staff ID + password** on a **tablet (main target), phone or laptop**. Staff passwords hashed with argon2id. Session bound to one store; **auto-logout after 15 min idle**; lockout after 5 wrong attempts.
- Roles: **cashier** (add visits, redeem codes, void own entries ≤ 10 min) and **manager** (everything a cashier can do + view customers, adjust points with a note, and open the owner dashboard).
- **Development seed:** Staff ID **`0000`**, password **`0000`** for Suatu, role **manager** (the cashier/manager account), so testing is instant. It is the **only** non-customer account in the seed.
- **Production safety (required):** the seed is development-only. A production build must **refuse** any staff account whose password is `0000` (or shorter than 8 chars) and force the owner to set a real one on first login. Add a test proving `0000/0000` cannot log in when `NODE_ENV=production`.
- Owner manages staff (add, disable, reset password) from the dashboard.

---

## 7. Data model & points engine

All tables: uuid pk, `created_at`, `updated_at`; **RLS on every table**, with tests.

- **stores** — slug, name, country, timezone, currency, locale, reward_mode (`visits`|`spend`), points_per_visit (**5**), points_per_currency_unit, daily_earn_cap (nullable; **NULL for Suatu**), repeat_entry_warning_seconds (nullable; **NULL for Suatu**), max_amount_per_transaction, branding (logo, colors, cover), address, status.
- **store_members** — owners. **staff** — store_id, staff_code (`0000` in dev), role (`cashier` | `manager`), display_name, password_hash, active, must_change_password, last_login_at, failed_attempts, locked_until.
- **customers** — status (`unclaimed` = auto-created by staff entry | `active` = signed up | `deleted`), auth_user_id (nullable until signup), phone_e164 (unique), email (unique), first_name, last_name, is_adult_confirmed, email_verified_at, deleted_at.
- **store_customers** — store_id, customer_id, joined_at, last_visit_at, visit_count, points_balance (cached = ledger sum), program_terms_accepted_at + version, privacy_accepted_at + version, marketing_email_consent (+ timestamp, source).
- **point_transactions** — append-only ledger (earn | redeem | adjust | reversal | expire), points (signed), amount_cents, source (`staff_manual` | `qr_claim` | `owner_adjust` | `pos_*` | `system`), staff_id, external_ref, reverses_transaction_id, **idempotency_key unique**, note. Never updated or deleted.
- **rewards**, **redemptions** (6-digit code, 5-min expiry, attempts, confirmed_by), **offers**, **claims** (later QR), **automations**, **message_log**, **audit_log**, **legal_documents** (type, version, effective_at, body), **integrations** & **subscriptions** (placeholders).

Postgres functions (`security definer`, called only from server code):
- `earn_points(store, phone, staff, idempotency_key)` → **creates a customer account automatically** for any never-seen phone number (status `unclaimed`, no password yet), locks the membership row, applies caps only if set, inserts ledger row, updates balance/visits, audits, returns `{added, balance, next_reward, visits_to_next_reward, reward_available, customer_display_name}`.
- `link_customer_on_signup(auth_user, phone)` → attaches pending points to the new account.
- `create_redemption`, `complete_redemption(code, staff)` (balance never below 0; lock after 5 wrong codes), `void_transaction` (own entries ≤ 10 min), `adjust_points` (owner, note required).

Progress maths (one shared tested function): next reward = cheapest active reward not yet affordable; `visits_to_next = ceil((cost − balance) / points_per_visit)`; progress = `min(100, balance / cost × 100)`; if any reward is affordable → "unlocked".

---

## 8. Rules & regulations to build in (US first, Romania-ready)

I'm not a lawyer; Claude Code should implement these as product requirements and flag anything that needs legal review in `docs/DECISIONS.md`.

- **Loyalty Program Terms page** (`/legal/suatu/program-terms`), versioned and accepted at signup: points have **no cash value**, are non-transferable, can't be exchanged for cash or fuel discounts unless stated, how points are earned (per visit), rewards and costs, expiration policy (MVP: **points don't expire** — say so), the store may change or end the program with notice, fraud/abuse can void points, contact info.
- **Privacy Policy** (`/legal/privacy`) and **Terms of Use**: use the documents in the **`legal/` folder** (`legal/privacy-policy.md`, `legal/terms-of-service.md`, written for the waitlist site) as the base and wording style. Keep those originals unchanged; create the app versions as new files in `legal/` (`app-privacy-policy.md`, `app-terms-of-use.md`, `suatu-program-terms.md`), mark them "template — review before launch", and render them on the legal pages. Adapt for app accounts: what's collected (phone, names, email, visits, points), why, retention, deletion, no selling of data, California rights (CCPA/CPRA), contact `bmihaistudio@gmail.com`.
- **TCPA:** no SMS of any kind in the MVP. Phone number is for identification and login only — say so at signup.
- **CAN-SPAM:** marketing email only with opt-in; every marketing email has an unsubscribe link and a postal address (placeholder `[MAILING ADDRESS]` in config).
- **Age:** 18+ checkbox at signup; no data knowingly collected from children (COPPA).
- **Accessibility (ADA):** WCAG **2.2 AA** — contrast, focus visible, 24×24 px minimum targets (aim 44×44), labels, errors announced, works with VoiceOver and TalkBack, respects `prefers-reduced-motion`, text zoom to 200% without breaking.
- **Account deletion inside the app** (also required later by Apple/Google if we ever ship to stores).
- **Security basics:** HTTPS-only cookies, CSRF protection on mutations (server actions + origin checks), security headers (CSP, HSTS, X-Content-Type-Options, frame-ancestors none), rate limits, no PII in logs (mask `••• 0142`).
- **Consent records:** store what was accepted, which version, when, and from which screen.
- Romania later: GDPR lawful basis, DPA per business — keep consent and export/delete flows generic so this is configuration, not a rewrite.

---

## 9. Design direction (must not look AI-generated)

Write the chosen direction into `docs/DESIGN.md` before building screens. Use the `frontend-design` mindset: intentional, specific to **a gas station**, not a generic SaaS template.

**Personality:** road-side, calm, a little industrial — think fuel-price signs, lane markings, a well-kept station at dusk. Confident, uncluttered, fast.

**Colors (tokens in `src/styles/tokens.css`; Claude Code may refine but must keep greens as the identity and pass contrast checks):**

| Token | Value | Use |
|---|---|---|
| `--forest-950` | `#07231A` | App background (dark, default theme) |
| `--forest-800` | `#0E3B2C` | Raised surfaces |
| `--green-600` | `#1E7A4F` | Primary brand green |
| `--green-400` | `#3FBF7F` | Highlights, progress fill |
| `--lime-300` | `#C6F06A` | Single accent: points number, "unlocked" moments (use rarely) |
| `--mist-100` | `#EAF4EE` | Primary text on dark |
| `--mist-400` | `#9DB8AA` | Secondary text |
| `--signal-amber` | `#F2B84B` | Warnings only |
| `--signal-red` | `#E5604D` | Errors only |

A light theme (mist background, forest text) for the staff screen in bright shops; customer app defaults to dark green, follows system setting.

**Transparent ("glass") buttons — required style:**
- Primary: translucent green fill `rgba(63,191,127,0.18)` + 1 px border `rgba(198,240,106,0.45)` + `backdrop-filter: blur(14px) saturate(140%)` + subtle inner top highlight; text `--mist-100`. Pressed: fill to 0.28 and `transform: scale(0.98)`.
- Secondary: `rgba(234,244,238,0.06)` fill, `rgba(234,244,238,0.18)` border.
- **Text contrast ≥ 4.5:1 and button boundary ≥ 3:1 against what's behind it — verify with axe tests.**
- Fallback when `backdrop-filter` isn't supported (`@supports`): solid `--forest-800` with the same border.
- Blur only small elements (buttons, bottom nav, sheets) — **never blur long scrolling lists** (kills scroll performance on older Androids).

**Logo:** use the files in `brand/suatu/` exactly as its README describes (wordmark in headers, road "A" mark for small spots, PNG icons in the PWA manifest, favicon, apple-touch icon, OG image). Don't redraw the logo.

**Typography:** a characterful but readable pairing, self-hosted via `next/font` (no layout shift), e.g. **Space Grotesk** for numbers/headings (points look like a fuel-price display, `font-variant-numeric: tabular-nums`) + **Inter** for body. Base 16 px (inputs **≥ 16 px** so iOS doesn't zoom).

**Icons:** only the custom set in `brand/suatu/icons/`, used as its README says (two-tone: main lines `currentColor`, detail `--icon-accent` = lime on dark, Suatu green on light). If an icon is missing, draw it in the same style (24 grid, 2 px stroke, square caps, miter joins) and add it to the folder, never pull one from a library.

**Avoid the "AI look":** no purple/blue gradients, no emoji as icons, no generic stock illustrations, no "✨", no identical floating cards with big shadows everywhere, no centered-everything hero, no lorem ipsum. Use real hierarchy, a grid, one strong accent, purposeful whitespace, and real copy.

**Signature details:** the points number styled like a pump/price display; a progress bar that looks like a fuel gauge filling up; subtle lane-stripe divider motif; a satisfying (short, 300 ms) fill animation when points are added — disabled with reduced motion.

---

## 10. Device support & smoothness (QA world)

**Support matrix (must work and be tested):**

| Platform | Browsers | Notes |
|---|---|---|
| iOS / iPadOS **16.4+** | Safari, Chrome (WebKit) | Home-screen PWA, notch + Dynamic Island, home indicator |
| Android **10+** | Chrome, **Samsung Internet**, Firefox | Gesture nav and 3-button nav |
| Desktop | Chrome, Safari, Edge, Firefox (latest 2) | Staff screen + dashboard |

**Screen sizes:** 320 px (small Androids / iPhone SE) up to 430 px phones, tablets 768–1024 px (portrait + landscape), desktop. Nothing may overflow horizontally at 320 px.

**Layout rules:**
- `viewport-fit=cover` + `env(safe-area-inset-*)` paddings; bottom nav sits above the home indicator.
- Use `100dvh` / `svh`, never plain `100vh` (mobile toolbars).
- Keyboard: inputs scroll into view and aren't hidden by the on-screen keyboard; use correct `inputmode`, `enterkeyhint`, `autocomplete`.
- `touch-action: manipulation` (no 300 ms delay / accidental double-tap zoom); `-webkit-tap-highlight-color: transparent` with our own pressed state.
- Images: `next/image`, responsive sizes, AVIF/WebP.

**Smooth scrolling & performance:**
- Native momentum scrolling only — **no scroll-jacking libraries, no custom scroll containers** unless needed; `overscroll-behavior-y: contain` on sheets; `scroll-behavior: smooth` only for in-page anchor jumps (and off under reduced motion).
- Animate only `transform` and `opacity`; target **60 fps** on a mid-range Android.
- Budgets (production build, mobile, throttled): **LCP < 2.5 s, INP < 200 ms, CLS < 0.1**, initial JS for the customer home **< 150 KB gzipped**. Lighthouse ≥ 90 on Performance, Accessibility, Best Practices, SEO.
- Polling pauses when the tab is hidden; no layout shift when the balance updates.

**Testing on devices:**
- Playwright projects: `iPhone SE`, `iPhone 15 Pro`, `Pixel 7`, `Galaxy S9+` (small Android), `iPad (gen 7)` landscape, Desktop Chrome / Safari (WebKit) / Firefox.
- Automated: golden path e2e on every project; axe accessibility checks on every screen; visual snapshots of the main screens; no horizontal scroll at 320 px.
- Manual checklist in `docs/TESTING.md`: real iPhone (Safari + home-screen install), real Android (Chrome + Samsung Internet), VoiceOver + TalkBack pass, landscape, dark/light, 200% text, slow 3G, offline page, airplane mode mid-action.

---

## 11. Screens

**Customer app (`/s/suatu`)** — bottom nav: Home · Rewards · History · Account.
- Home: greeting with first name, **points "35 / 100"** (price-display style), fuel-gauge progress, "13 more visits to a Free coffee" or "Free coffee unlocked — Redeem", current offers, last visit. Auto-updates every 3 s.
- Rewards: list, Redeem → full-screen 6-digit code + countdown + screen kept awake where supported.
- History: visits and redemptions with local date/time.
- Account: §4.4. Plus "Add to Home Screen" helper (iOS share-sheet instructions; Android install prompt).
- Signup / Login screens (§4). Legal pages.

**Staff screen (`/staff/suatu`)** — **tablet-first** (portrait and landscape), fully usable on a phone, also works on a laptop; light theme, huge targets, numeric keypad for the phone field, keyboard-friendly (Enter submits):
- Login (Staff ID + password). Main: phone field → **Add visit (+5)**; success banner with name initial, balance and progress; **Redeem code**; recent entries with **Void** (10 min). Never-seen phone → account created automatically: "New customer · +5 points · 5 / 100 — they can sign up with this number to see their points."

**Owner dashboard (`/dashboard/suatu`)** — overview (members, visits today/7/30 days, returning customers, rewards redeemed), customers (masked phones, detail, adjust with note), rewards CRUD, offers CRUD with image + preview, staff management, settings (points per visit, reward costs, branding preview), **CSV export**, printable "Join Suatu Rewards" counter sign with QR to the signup page.

**Admin (`/admin`)** — stores, owners, audit log.

**Dev home (`/`, development only)** — links to every screen, demo credentials (`0000` / `0000`, demo customer phones and passwords), Mailpit link, and how to open the app on my phone.

Every screen: loading, empty, error and offline states; all text through next-intl.

---

## 12. Milestones (stop after each)

1. **Setup** — install/check Node LTS, pnpm, Docker Desktop, Supabase CLI; scaffold Next.js + TS + Tailwind; design tokens + fonts; lint/format/Husky; `.vscode` (ESLint, Prettier, Tailwind IntelliSense, Playwright, GitLens; format on save; debug config); scripts `pnpm dev`, `pnpm dev:lan` (binds 0.0.0.0, prints `http://<laptop-ip>:3000`), `pnpm db:reset`, `pnpm test`, `pnpm e2e`. Write `docs/DESIGN.md`. Done when the dev home loads on laptop and phone.
2. **Accounts** — customer signup + login (phone + password), password rules, lockout, logout, forgot-password via Mailpit, account page basics; legal pages + consent records; staff login `0000/0000` (manager, dev) + production guard test; staff screen layout on tablet + phone. **All §4.3b password/code test cases** pass on every device project.
3. **🎯 Golden path** — points ledger + functions, Suatu seed (5 pts/visit, Free coffee 100), staff "Add visit", customer home with live balance, redemption code flow, pending-points merge on signup. **Done when all of §0 passes by hand on my phone and as automated tests**, including: 20 earns → 100; redeem → 0; 21 → 105 → redeem → 5; same idempotency key twice → +5 once; 4 phone formats → one customer; two concurrent earns → +10; pending points merge.
4. **Design & device polish** — full visual design per §9 (glass buttons, gauge, price-display numbers), animations, dark/light, safe areas, keyboard handling, 320 px, tablets; axe + visual snapshots; performance budgets met.
5. **Customer app complete** — rewards, history, account (edit, change password, export, delete), PWA manifest + service worker + offline page, install helper.
6. **Staff screen complete** — recent entries, void, idle logout, unknown-number flow, light theme, tablet landscape.
7. **Owner dashboard** — overview, customers, adjust, rewards, offers, staff management (forces real passwords), settings, CSV export, printable sign.
8. **Admin, i18n skeleton, security pass** — admin pages, `ro.json`, security headers, rate limits review, PII masking check.
9. **Quality & handoff** — full Playwright suite on all device projects, Lighthouse CI, GitHub Actions, manual checklist filled in `docs/TESTING.md`, final docs and deploy notes (Vercel + Supabase Cloud, real SMS/email providers, what must change before production).

---

## 13. Out of scope for the MVP (design for it, don't build it)

SMS / OTP login; POS integrations (Square → Clover → Toast) via `PosAdapter`; QR self-claim at the counter (table exists); spend-based points for fuel; Stripe billing; push notifications; automated marketing campaigns beyond a stub; native App Store apps; multiple stores per customer wallet; Romanian content; custom domains.

---

## 14. Definition of done

- From a clean clone: `pnpm install && pnpm db:reset && pnpm dev` — README is enough.
- §0 golden path passes by hand on **my iPhone or Android over Wi-Fi** and in automated tests on every device project.
- Customers can sign up, log in, reset a password, edit, export and delete their account; all data is stored and visible (masked) in the owner dashboard and CSV export.
- `0000 / 0000` works in development and is refused in production.
- Lint, types, unit, DB, e2e, accessibility and Lighthouse checks pass; CI present.
- Looks like a real, designed gas-station product, not a template.

---

## Kickoff prompt (paste into Claude Code)

```
Read MVP_SPEC.md in this folder completely — it is the source of truth (v3; ignore the backup files unless I ask).
The most important requirement is §0: customers create an account with phone, first/last name, email and password, log in with phone + password, and every time staff (login 0000/0000 = cashier/manager account, in development, on a tablet or phone) enter a phone number they get +5 points — any never-seen number instantly creates a customer account —  toward a 100-point Free coffee, shown live in the customer app.
The app is for a gas station called "Suatu", green identity, translucent "glass" buttons, smooth on all common phones, and must not look like an AI template (see §9 and §10).
Follow §1 "Working rules" exactly. First reply with:
1) your plan per milestone,
2) questions or technical/legal concerns,
3) the exact tools I need to install on this Mac (check what's installed first, give the commands).
Do not write code until I reply "go". Then build Milestone 1 only and stop.
```
