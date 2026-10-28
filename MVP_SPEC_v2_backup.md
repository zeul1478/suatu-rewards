# MVP Spec — Local Loyalty & Specials Web App (v2)

> **How to use this file:** This folder (`~/Desktop/APP`) is the project. Open it in VS Code, open the terminal (View → Terminal), run `claude`, and paste the kickoff prompt at the bottom. Claude Code treats this file as the source of truth and updates it (and `docs/DECISIONS.md`) if a decision changes.
>
> v1 of this spec is kept as `MVP_SPEC_v1_backup.md` for reference only.

---

## 0. The one test that matters (the "golden path")

Everything in this MVP exists to make this test work, reliably, on my laptop and my phone. **Build this end to end first (Milestone 2), then harden and expand.**

**Demo store:** Harbor Coffee · reward mode **visits** · **5 points per visit** · reward **"Free coffee" = 100 points** (20 visits).

| Step | I do | I must see |
|---|---|---|
| 1 | Open the **counter screen** on my laptop, log in with staff PIN `1234` | A big "Phone number" field and an **Add visit (+5)** button |
| 2 | Type `954-555-0142` (any format) and tap **Add visit** | Success: **"+5 points · 5 / 100 · 19 more visits to a Free coffee"** |
| 3 | Open the **customer app** for that number (on my laptop, or on my phone over Wi-Fi) | **5 / 100 points**, a progress bar at 5%, "19 more visits to a Free coffee" |
| 4 | Enter the **same number again** on the counter, 19 more times, quickly | Every entry adds **+5**. The customer app updates **within ~3 seconds without refreshing**: 10, 15 … 100 |
| 5 | At 100 points | Customer app shows **"🎉 Free coffee unlocked"** with a **Redeem** button; counter success message says "Reward available!" |
| 6 | Tap **Redeem** in the customer app | A large **6-digit code** valid for 5 minutes |
| 7 | Type that code on the counter → **Redeem code** | "Free coffee redeemed for ••• 0142". Customer app drops to **0 / 100** |
| 8 | Add one more visit | **5 / 100** again |

Rules this test depends on (they are requirements, not suggestions):
- **Every submission credits +5.** Re-entering the same number seconds apart must NOT be blocked in the demo store. Duplicate protection only stops the *same submit* being processed twice (double-click / network retry), never a new entry.
- `(954) 555-0142`, `954-555-0142`, `9545550142` and `+1 954 555 0142` are **the same customer**.
- Points above the reward cost carry over (105 → redeem 100 → 5 left).
- The balance shown on the counter and in the customer app always equals the sum of the ledger (section 6).

---

## 1. Working rules for Claude Code

1. **Plan first.** Read this whole spec, then reply with: (a) a short plan per milestone, (b) questions or technical concerns, (c) the tools I need to install, after checking what's already installed (this is a **MacBook Pro, Apple Silicon, macOS**). Wait for my "go".
2. **One milestone at a time** (section 10). After each: run lint, type-check and tests; git commit; then tell me in plain English **exactly what to open and click** to see it working. Stop and wait for "next".
3. **Runs 100% locally.** No cloud accounts for the MVP. Local Supabase via Docker.
4. **Neat, human-readable code.** Small files, clear names, comments only where logic isn't obvious, the folder structure in section 4. No dead code, no giant components, no business logic inside React components.
5. **Never commit secrets.** `.env.local` is git-ignored; keep `.env.example` current.
6. **No invented claims, stats or testimonials** in the UI. Seed data must be obviously fictional.
7. **Push back.** If something here is a bad idea technically, say so and propose a better option before building it.
8. **Prefer boring and reliable over clever.** When two approaches work, pick the one with fewer moving parts.
9. Keep `README.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` updated as you go.

---

## 2. Product summary

A loyalty and specials platform for independent, **counter-service** local businesses (cafés, bakeries, bars, salons, barbershops, car washes, gas station shops, boutiques).

It is **one web app with four areas**, sharing one database:

| Area | URL | Who | Device |
|---|---|---|---|
| **Counter screen** | `/counter/[storeSlug]` | Cashier / staff | Store's existing tablet or phone |
| **Customer app** (installable PWA) | `/s/[storeSlug]` | The customer | Their own phone |
| **Owner dashboard** | `/dashboard/[storeSlug]` | Shop owner | Laptop or phone |
| **Admin** | `/admin` | Me (platform admin) | Laptop |

- Customers earn points by giving their **phone number** (or email) at checkout. Works with cash or card, alongside any register. **No POS integration in the MVP.**
- Primary market: Fort Lauderdale, FL (USD, English, `America/New_York`). Must be ready for Romania later (RON, Romanian, GDPR) without a rewrite.

---

## 3. Tech stack (chosen with post-MVP versions in mind)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (latest stable, App Router) + TypeScript strict** | One codebase for all four areas; easy Vercel deploy later; subdomains via middleware later |
| Package manager | **pnpm** | Fast, strict |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, RLS), local via **Supabase CLI + Docker Desktop** | Phone OTP + email magic link built in; RLS for multi-tenant isolation; migrations in repo; same setup in cloud later |
| Data access | **Server-side only** via `@supabase/ssr` + generated TS types | See "phone testing" rule below |
| Points logic | **Postgres functions (RPC) in a single transaction** with row locking | Correct balances even with double taps or two cashiers at once |
| Validation | **Zod** on every form, server action and route | One source of truth |
| UI | **Tailwind CSS + shadcn/ui** + `lucide-react` | Clean, accessible, themeable per store |
| Phone numbers | `libphonenumber-js`, store **E.164** | US + Romania |
| i18n | **next-intl** (English now, `ro.json` skeleton) | Romania later |
| Time | Store timezone per store; `date-fns` + `@date-fns/tz` | Daily caps, specials and automations use local time |
| Live updates | **Polling a Next.js route every 3 s while the page is visible** (pause when hidden) | Works on a phone over Wi-Fi with zero extra config; can switch to Supabase Realtime later |
| PWA | Web manifest per store + service worker (**Serwist**) | Installable store apps; push later |
| Email | `EmailSender` interface: local dev = Supabase local inbox (Mailpit) / console; **Resend** adapter behind env vars | No lock-in |
| SMS | `SmsSender` interface: **console only** in MVP; Twilio adapter stub | Needs consent + 10DLC before real use |
| Testing | **Vitest** (unit + DB function tests against local Supabase) + **Playwright** (e2e, incl. a mobile viewport) | |
| Quality | ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged | |
| CI | GitHub Actions: lint, typecheck, unit, e2e with local Supabase | |
| Hosting later | Vercel + Supabase Cloud (document only, don't deploy) | |

**Phone-testing rule (important):** the browser must **only ever talk to the Next.js server**, never directly to Supabase. Reason: when I open the customer app on my phone at `http://<laptop-ip>:3000`, a browser-side Supabase client pointing at `localhost:54321` would fail. All reads/writes and auth go through server components, server actions and route handlers.

---

## 4. Project structure

```
APP/
├─ MVP_SPEC.md
├─ README.md
├─ docs/ (ARCHITECTURE.md, DECISIONS.md, TESTING.md)
├─ .vscode/ (extensions.json, settings.json, launch.json)
├─ supabase/ (config.toml, migrations/, seed.sql)
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 # dev home: links to every demo area + demo credentials
│  │  ├─ s/[storeSlug]/           # CUSTOMER app: home, rewards, history, profile
│  │  ├─ claim/[token]/           # QR claim page
│  │  ├─ counter/[storeSlug]/     # STAFF counter screen
│  │  ├─ dashboard/[storeSlug]/   # OWNER dashboard
│  │  ├─ admin/                   # PLATFORM ADMIN
│  │  ├─ auth/                    # login, OTP verify, callbacks
│  │  └─ api/                     # route handlers (customer status poll, manifest, cron)
│  ├─ components/ (ui/ = shadcn; feature folders)
│  ├─ server/                     # ALL business logic + data access
│  │  ├─ points/ rewards/ offers/ customers/ stores/ staff/ automations/ exports/
│  │  └─ integrations/            # PosAdapter interface + stubs (not implemented)
│  ├─ lib/ (supabase server client, auth, phone, money, time, rate-limit, storeUrl)
│  ├─ messaging/ (EmailSender, SmsSender + implementations)
│  ├─ messages/ (en.json, ro.json skeleton)
│  └─ types/ (generated DB types)
└─ tests/ (unit/, db/, e2e/)
```

Path-based tenants now (`/s/harbor-coffee`). Never hard-code paths; always use a `storeUrl(slug, path)` helper so subdomains later only need middleware.

---

## 5. Roles & authentication

| Role | Login | Can do |
|---|---|---|
| **Customer** | Phone OTP or email magic link (Supabase Auth) | View points, history, rewards, specials; get a redemption code; manage consent; export/delete their data |
| **Staff** | Store + **4–6 digit PIN** (hashed); session bound to that store; auto-logout after 15 min idle | Add visits/spend, show QR claim, redeem codes, void own entries within 10 min |
| **Owner** | Email magic link | Everything for their store(s) |
| **Admin** | Email magic link + `is_platform_admin` | Create stores, invite owners, pause stores, audit log |

- **Earning never requires the customer to log in.** Viewing points and redeeming does.
- **Local dev logins (no real SMS):** configure Supabase **test OTP numbers** in `supabase/config.toml` — every seeded customer phone uses code **`123456`**. Email magic links arrive in the local Mailpit inbox (document its URL).
- **Dev-only shortcut:** on the counter success message, show a small "Open customer app" link (only when `NODE_ENV=development`) that opens that customer's app already logged in, so I can test the golden path fast. This route must not exist in production builds — add a test that proves it.

---

## 6. Data model (Postgres, SQL migrations only)

All tables: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` where useful. **RLS on every table**, with tests proving isolation.

- **stores** — slug (unique), name, country (`US`/`RO`), timezone, currency (`USD`/`RON`), locale, reward_mode (`visits` | `spend`), points_per_visit (default **5**), points_per_currency_unit, **daily_earn_cap_per_customer (nullable = no cap; NULL in demo store)**, **repeat_entry_warning_seconds (nullable = off; NULL in demo store)**, max_amount_per_transaction, branding (logo_path, primary_color, accent_color, cover_image_path), address, status, plan.
- **store_members** — store_id, user_id, role (`owner`).
- **staff** — store_id, display_name, pin_hash, active, last_login_at.
- **customers** — phone_e164 (unique, nullable), email (unique, lowercased, nullable), auth_user_id, first_name, birthday (month/day). At least one of phone/email.
- **store_customers** — store_id, customer_id, joined_at, last_visit_at, visit_count, **points_balance** (cached; always equals ledger sum), consent fields with timestamps and source. unique(store_id, customer_id).
- **point_transactions** — **append-only ledger**: store_id, customer_id, type (`earn` | `redeem` | `adjust` | `reversal` | `expire`), points (signed), amount_cents, currency, source (`counter_manual` | `qr_claim` | `owner_adjust` | `pos_square` | `pos_clover` | `pos_toast` | `system`), external_ref, staff_id, reverses_transaction_id, **idempotency_key (unique — one per form submission, generated when the form renders)**, note. Never update or delete rows.
- **claims** — one-time QR claims (token, points, amount, expires_at 10 min, claimed_by, status).
- **rewards** — store_id, title, points_cost, active, sort_order, image_path.
- **redemptions** — store_id, customer_id, reward_id, code (6 digits, 5 min), status, attempts, confirmed_by_staff_id, point_transaction_id.
- **offers** — store_id, title, description, image_path, starts_at, ends_at, weekly recurrence, active.
- **automations**, **message_log**, **audit_log**, **integrations** (placeholder), **subscriptions** (placeholder) — as in v1.

**Points functions (Postgres, `security definer`, called only from server code):**
- `earn_points(store, customer_identifier, points|amount, staff, idempotency_key, external_ref?)` — find/create customer + membership, lock the membership row (`SELECT … FOR UPDATE`), apply caps if set, insert ledger row, update balance and visit stats, write audit entry, return `{added, balance, next_reward, visits_to_next_reward, reward_available}`. Calling it twice with the same idempotency key returns the first result without adding points.
- `create_redemption(...)`, `complete_redemption(code, staff)` — balance can never go below zero; lock after 5 wrong codes.
- `void_transaction(...)`, `adjust_points(...)`.

---

## 7. Business rules

**Earning (counter):**
1. Staff types phone (any common format) or email → normalize to E.164 with the store's country default. Invalid → clear message ("That doesn't look like a phone number").
2. New customer → one-tap consent row on the counter: "Customer agreed to join Harbor Coffee rewards" (required) + optional "…and to get offers by email". Seeded demo customers are pre-consented so the golden path has no extra step.
3. `visits` mode: **+points_per_visit** per submission. `spend` mode: staff enters amount → `floor(amount × points_per_currency_unit)`.
4. Optional receipt #; if provided, `(store_id, external_ref)` must be unique.
5. Caps and repeat-entry warning apply **only if set** for the store. Repeat warning = soft prompt "This number was entered 30 seconds ago — add anyway?", never a silent block.
6. After success the field clears and focuses again, ready for the next customer.

**Progress maths (one shared function, unit tested):**
- Next reward = cheapest active reward with `points_cost > balance`; if the balance covers one or more rewards, show "reward available" for the cheapest affordable one.
- `visits_to_next_reward = ceil((next_cost − balance) / points_per_visit)` (visits mode).
- Progress % = `min(100, balance / next_cost × 100)`.

**QR claim:** staff creates a one-time claim → big QR + short code → customer scans `/claim/[token]`, enters phone → credited once; expires in 10 min; rate-limited.

**Redeeming:** logged-in customer taps an affordable reward → 6-digit code (5 min) → staff types it on the counter → negative ledger row → both screens update.

**Corrections:** staff voids own entry within 10 min (creates a reversal); owner adjusts with a required note. Everything audited.

**Payment method never matters.** Cash and card are identical.

---

## 8. Screens

**Counter screen** (tablet-first, big targets, one hand, keyboard-friendly — Enter submits):
- PIN login → main view: phone field + **Add visit (+5)** (or amount field in spend mode), optional receipt #, buttons **Show QR**, **Redeem code**.
- Success banner (large, green): "+5 points · 35 / 100 · 13 more visits to a Free coffee"; "Reward available!" when applicable.
- "Recent entries" list (this staff member) with **Void** for 10 minutes.
- Works without page reloads; disabled button while submitting.

**Customer app** (`/s/[storeSlug]`, mobile-first, branded, installable):
- Home: store logo/colors, greeting, **big points number "35 / 100"**, progress bar, "13 more visits to a Free coffee" or "🎉 Free coffee unlocked — Redeem", active specials, last visit. **Auto-updates every 3 s while open.**
- Rewards, History, Profile (consent toggles, download my data, delete account, log out), Add-to-Home-Screen helper.
- Logged-out: how to earn + login by phone or email.

**Owner dashboard:** overview stats, customers (masked phones, detail + adjust), rewards CRUD, offers CRUD with image upload + preview, automations, staff (add, reset PIN), settings (reward mode, **points per visit**, caps, branding with live preview), **CSV export**, printable QR counter sign.

**Admin:** stores list/create, invite owner, pause store, audit log.

**Dev home (`/`, development only):** links to every area of both demo stores, with demo PINs, test phone numbers and OTP code printed on the page.

All UI: accessible (labels, focus, keyboard, WCAG AA), responsive, loading/empty/error states, all text via next-intl.

---

## 9. Security, privacy & reliability

- RLS everywhere + tests: Store A's owner/staff cannot read or change Store B; a customer cannot read another customer.
- Service-role key server-only. Validate all input with Zod. Never trust client-sent points or balances.
- Rate limits: OTP, earn endpoint, claims, redemption attempts. Staff PINs hashed.
- Security headers via Next.js config.
- Customer data export (JSON) and deletion (anonymize PII, keep ledger with anonymized reference).
- Money as integer cents. Timestamps UTC, displayed in store timezone. No PII in logs (mask phones/emails). **No real SMS in the MVP.**

---

## 10. Milestones (stop after each)

1. **Setup** — check/install Node LTS, pnpm, Docker Desktop, Supabase CLI (Homebrew); scaffold Next.js + TS + Tailwind + shadcn/ui + lint/format/Husky; `.vscode` (recommended extensions: ESLint, Prettier, Tailwind IntelliSense, Playwright, GitLens; format on save; debug config); local Supabase running; scripts `pnpm dev`, `pnpm dev:lan` (binds 0.0.0.0 and prints `http://<laptop-ip>:3000`), `pnpm db:reset`, `pnpm test`, `pnpm e2e`. Done when the dev home page loads.
2. **🎯 Golden path slice** — minimal tables (stores, staff, customers, store_customers, point_transactions, rewards, redemptions), `earn_points` / redemption functions, seed Harbor Coffee (5 pts/visit, Free coffee 100 pts, staff PIN 1234), simple counter screen, simple customer screen with 3 s polling, dev-only customer login shortcut. **Done when the whole section 0 table works by hand AND as an automated test**:
   - Vitest DB test: 20 earns → 100; redeem → 0; 21 earns → 105, redeem → 5; same idempotency key twice → +5 once; 5 different phone formats → one customer; two concurrent earns → +10.
   - Playwright: counter adds 20 visits → customer page shows 100 and Redeem → code → counter redeems → customer shows 0 (desktop + iPhone viewport).
   - Then I test it on my real phone with `pnpm dev:lan`.
3. **Full data model & RLS** — remaining tables, all RLS policies, isolation tests, second demo store "Sunset Car Wash" (spend mode: 1 point per $1, "Free wash" at 150), richer seed data.
4. **Real auth** — customer phone OTP (test numbers, code 123456) and email magic link, owner magic link, staff PIN sessions + idle logout, admin flag, route protection. Dev shortcut stays dev-only.
5. **Counter screen complete** — spend mode, receipt #, QR claims, repeat-entry warning, void, recent entries, consent step for new customers.
6. **Customer app complete** — branding, rewards list, history, profile, consent, data export/delete, per-store manifest, service worker, install helper.
7. **Owner dashboard** — overview, customers, adjust, rewards, offers with images, staff, settings with live branding preview, CSV export, printable QR sign.
8. **Automations** — welcome, birthday, win-back via email (Mailpit locally), cron route protected by a secret, message log, unsubscribe link.
9. **Admin & polish** — admin pages, `ro.json` skeleton, accessibility pass, Lighthouse ≥ 90 on the customer app (production build).
10. **Quality & handoff** — full Playwright suite (golden path, QR claim, spend mode, offers appear in app, cross-store isolation, export/delete), GitHub Actions CI, final README / ARCHITECTURE / DECISIONS / TESTING docs, deployment notes for Vercel + Supabase Cloud.

---

## 11. Out of scope for the MVP (design for it, don't build it)

POS integrations (Square → Clover → Toast) via `integrations` table + `PosAdapter`; Stripe billing; real SMS and web push; subdomains/custom domains; native App Store apps; shared "all my stores" wallet; Romanian content, RON payments, e-Factura; multi-location chains.

---

## 12. Definition of done

- From a clean clone: `pnpm install && pnpm db:reset && pnpm dev` and the README is all I need.
- The **section 0 golden path passes by hand on my laptop and my real phone**, and as automated tests.
- I can also: use spend mode, a QR claim, post an offer and see it in the customer app, export CSV, and see every entry in the owner dashboard.
- Lint, type-check, unit, DB and e2e tests pass; CI workflow present; code organized as in section 4.

---

## Kickoff prompt (paste into Claude Code)

```
Read MVP_SPEC.md in this folder completely. It is the source of truth.
Section 0 (the golden path) is the most important requirement: every phone-number entry adds +5 points toward a 100-point Free coffee, and the customer app shows it.
Follow section 1 "Working rules" exactly. First reply with:
1) your plan per milestone,
2) questions or technical concerns about the spec,
3) the exact tools I need to install on this Mac (check what's already installed first, give the commands).
Do not write code until I reply "go". Then build Milestone 1 only and stop.
```
