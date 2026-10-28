# MVP Spec — Local Loyalty & Specials Web App

> **How to use this file:** Put it in the root of an empty project folder, open the folder in VS Code, start Claude Code in the VS Code terminal, and paste the kickoff prompt from the bottom of this file. Claude Code should treat this document as the source of truth and keep it updated if decisions change.

---

## 0. Working rules for Claude Code

1. **Plan first.** Before writing code, read this whole spec, then reply with: (a) a short implementation plan per milestone, (b) any questions where the spec is ambiguous, (c) the list of tools I need installed. Wait for my "go".
2. **Build milestone by milestone** (section 9). After each milestone: run lint, type-check and tests, make a git commit, and give me a short summary plus exactly what to open in the browser to see the new pages. Then stop and wait for my "next".
3. **Everything runs locally on my laptop** (macOS/Windows — detect which). No cloud accounts needed for the MVP. Use local Supabase via Docker.
4. **Keep the code neat and readable for a human.** Small files, clear names, comments only where logic isn't obvious, consistent folder structure (section 3). No dead code, no giant components.
5. **Never commit secrets.** Use `.env.local` (git-ignored) and keep `.env.example` up to date.
6. **Don't invent product claims, statistics or fake testimonials** anywhere in the UI. Sample/seed data must be obviously fictional ("Harbor Coffee", "Sam Rivera").
7. **If something in this spec is a bad idea technically, say so and propose a better option** before building it.
8. Keep `README.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` (short architecture decision log) updated as you go.

---

## 1. Product summary

A loyalty and specials platform for independent, counter-service local businesses (cafés, bakeries, bars, salons, barbershops, car washes, gas station shops, boutiques).

- Each **store** gets its own branded, installable mobile web app (PWA) showing points, rewards and current specials.
- **Customers** earn points by giving their phone number or email at checkout, or by scanning a one-time QR code at the counter. Works with cash or card and alongside any register. **No POS integration in the MVP.**
- **Staff** use a simple counter screen on the store's existing phone/tablet to credit visits/spend and redeem rewards.
- **Owners** use a dashboard to set rewards, post specials, view customers and export their data.
- **Platform admin** (me) can create and manage stores.

Primary market at launch: Fort Lauderdale, FL (USD, English). Must be ready for Romania later (RON, Romanian language, GDPR).

---

## 2. Tech stack (chosen with post-MVP versions in mind)

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (latest stable, App Router) + TypeScript (strict)** | One codebase for customer PWA, counter screen, owner dashboard and admin; server actions + route handlers; easy Vercel deploy later; subdomain routing via middleware later |
| Package manager | **pnpm** | Fast, strict |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, Row Level Security), run locally with the **Supabase CLI + Docker** | Phone OTP + email magic links built in, RLS for multi-tenant isolation, SQL migrations in repo, same setup in cloud later |
| DB access | `@supabase/supabase-js` + **generated TypeScript types** (`supabase gen types`) | Type-safe queries without fighting RLS |
| Validation | **Zod** for every form, server action and API input | One source of truth for input rules |
| UI | **Tailwind CSS + shadcn/ui** (Radix-based, accessible) + `lucide-react` icons | Clean, accessible, easy to theme per store |
| Phone numbers | `libphonenumber-js` — store all phones in **E.164** | Required for US + Romania |
| i18n | **next-intl**, English now, structure ready for Romanian | Romania later without refactor |
| Dates/time zones | Store timezone per store; use `date-fns` + `date-fns-tz` | "Today's special", automations and caps depend on local time |
| PWA | **Serwist** (service worker) + dynamic per-store web manifest | Installable store apps; web push later |
| Email | Provider interface with a **local dev implementation** (Supabase local mail inbox / console) and a **Resend** implementation behind env vars | No vendor lock-in |
| SMS | Provider interface with **console implementation only** in MVP; Twilio adapter stub for later | SMS needs legal consent + 10DLC registration before real use |
| Testing | **Vitest** (unit, especially points logic) + **Playwright** (end-to-end) | Quality gates |
| Code quality | ESLint, Prettier, `tsc --noEmit`, Husky + lint-staged pre-commit | Neat, consistent code |
| CI | GitHub Actions workflow: install, lint, type-check, unit tests, e2e (with local Supabase) | Ready when I push to GitHub |
| Hosting later | Vercel + Supabase Cloud (document the steps, don't deploy) | |

---

## 3. Project structure

```
/
├─ MVP_SPEC.md
├─ README.md
├─ docs/ARCHITECTURE.md, docs/DECISIONS.md
├─ .vscode/ (extensions.json, settings.json, launch.json)
├─ supabase/ (config.toml, migrations/, seed.sql)
├─ src/
│  ├─ app/
│  │  ├─ (marketing)/            # simple home page linking to demo store (landing page lives in a separate project)
│  │  ├─ s/[storeSlug]/          # CUSTOMER PWA: home, rewards, history, specials, profile
│  │  ├─ claim/[token]/          # customer QR claim page
│  │  ├─ counter/[storeSlug]/    # STAFF counter screen (PIN login)
│  │  ├─ dashboard/[storeSlug]/  # OWNER dashboard
│  │  ├─ admin/                  # PLATFORM ADMIN
│  │  ├─ auth/                   # login, OTP verify, callbacks
│  │  └─ api/                    # route handlers (manifest, cron, webhooks later)
│  ├─ components/ (ui/ = shadcn, plus feature folders)
│  ├─ server/                    # business logic ONLY here (no business logic in components)
│  │  ├─ points/  rewards/  offers/  customers/  stores/  staff/  automations/  exports/
│  │  └─ integrations/           # PosAdapter interface + stubs (square, clover, toast) — NOT implemented
│  ├─ lib/ (supabase clients, auth helpers, phone, money, time, i18n, rate-limit)
│  ├─ messaging/ (EmailSender, SmsSender interfaces + implementations)
│  ├─ messages/ (en.json, ro.json skeleton)
│  └─ types/ (generated DB types)
└─ tests/ (unit/, e2e/)
```

Routing note: MVP uses path-based tenants (`/s/harbor-coffee`). Write the code so switching to subdomains (`harbor-coffee.example.com`) later only requires middleware changes — never hard-code paths; use a `storeUrl(slug, path)` helper.

---

## 4. Roles & authentication

| Role | How they log in | Can do |
|---|---|---|
| **Customer** | Phone OTP (SMS) or email magic link via Supabase Auth | View their points, history, rewards, specials per store; generate a redemption code; manage consent; request data export/deletion |
| **Staff** | Owner creates staff with name + 4–6 digit PIN; counter screen login = store slug + PIN; short-lived session bound to that store | Credit visits/spend, create QR claims, redeem rewards, void their own mistakes within 10 minutes |
| **Owner** | Email magic link | Everything for their store(s): settings, branding, rewards, offers, staff, customers, automations, reports, CSV export |
| **Platform admin** | Email magic link + `is_platform_admin` flag | Create stores, invite owners, view all stores, impersonate read-only for support |

- **Local development:** configure Supabase **test OTP numbers** in `supabase/config.toml` (e.g. `+15555550100` → code `123456`) so phone login works without a real SMS provider. Email magic links open in the local Supabase mail inbox — document the URL in the README.
- Earning points never requires the customer to log in. **Viewing** points in the app and **redeeming** rewards requires a verified customer session.

---

## 5. Data model (Postgres, all via SQL migrations)

Every table: `id uuid pk default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at` where useful. **RLS enabled on every table**, with policies written and tested so a user can only see data for their own store / own customer record.

- **stores** — slug (unique), name, timezone, currency (`USD`/`RON`), locale (`en`/`ro`), reward_mode (`visits` | `spend`), points_per_visit, points_per_currency_unit, daily_earn_cap_per_customer, max_amount_per_transaction, branding (logo_path, primary_color, accent_color, cover_image_path), address, status (`active` | `paused`), plan (`basic` | `branded`, informational only in MVP).
- **store_members** — store_id, user_id, role (`owner`), unique(store_id, user_id).
- **staff** — store_id, display_name, pin_hash (bcrypt/argon2), active, last_login_at.
- **customers** — platform-wide identity: phone_e164 (unique, nullable), email (unique, nullable, lowercased), auth_user_id (nullable, linked once they verify), first_name (optional), birthday (month/day only, optional). Constraint: at least one of phone/email.
- **store_customers** — membership per store: store_id, customer_id, joined_at, last_visit_at, visit_count, cached_points_balance (denormalized, always recomputable), marketing_email_consent, marketing_sms_consent, consent_timestamps, consent_source. unique(store_id, customer_id).
- **point_transactions** — **append-only ledger**: store_id, customer_id, type (`earn` | `redeem` | `adjust` | `reversal` | `expire`), points (signed int), amount_cents (nullable), currency, source (`counter_manual` | `qr_claim` | `owner_adjust` | `pos_square` | `pos_clover` | `pos_toast` | `system`), external_ref (e.g. receipt or POS order id, nullable), staff_id (nullable), reverses_transaction_id (nullable), idempotency_key (unique), note. **Never update or delete rows**; corrections are `reversal`/`adjust` rows. Balance = sum of points.
- **claims** — one-time QR claims: store_id, token (random, unguessable), points, amount_cents, created_by_staff_id, expires_at (default 10 min), claimed_at, claimed_by_customer_id, status.
- **rewards** — store_id, title, description, points_cost, active, sort_order, image_path.
- **redemptions** — store_id, customer_id, reward_id, code (6 digits, expires in 5 min), status (`pending` | `completed` | `expired` | `cancelled`), confirmed_by_staff_id, point_transaction_id.
- **offers** — store_id, title, description, image_path, starts_at, ends_at, recurrence (none | weekly days-of-week with time window), visibility (`all` | `members`), active.
- **automations** — store_id, type (`welcome` | `birthday` | `win_back` | `weekly_special`), enabled, config (jsonb: e.g. win_back days = 30, offer text), channel (`email` in MVP).
- **message_log** — store_id, customer_id, automation_id (nullable), channel, template, status, sent_at, provider_message_id, error.
- **audit_log** — store_id, actor (user/staff/system), action, entity, entity_id, metadata jsonb. Write entries for every points change, redemption, staff action, settings change, export and deletion.
- **integrations** (placeholder for later) — store_id, provider (`square` | `clover` | `toast`), status, encrypted credentials ref, settings. Create the table and the `PosAdapter` interface; **do not implement** any provider.
- **subscriptions** (placeholder for later Stripe billing) — store_id, plan, status. Create the table only.

Indexes on all foreign keys, `customers.phone_e164`, `customers.email`, `store_customers(store_id, last_visit_at)`, `point_transactions(store_id, customer_id, created_at)`.

---

## 6. Core business rules (put in `src/server/`, fully unit tested)

**Earning (counter, manual):**
1. Staff enters phone (or email). Normalize phone to E.164 using the store's country default (US / RO). Reject invalid input with a clear message.
2. Find or create the platform customer, then find or create the store membership. First-time customers see a consent step on the counter screen: "Customer agreed to join [store]'s rewards" (required) and an optional "Customer agreed to receive offers by email" checkbox, with timestamps saved.
3. Mode `visits`: award `points_per_visit`. Mode `spend`: staff enters amount; award `floor(amount × points_per_currency_unit)`.
4. Optional receipt/reference number field. If provided, `(store_id, external_ref)` must be unique to block double-crediting the same receipt.
5. Enforce `max_amount_per_transaction` and `daily_earn_cap_per_customer` (in the store's local day). Show a friendly warning when a cap blocks a credit.
6. Write one `earn` ledger row with an idempotency key (prevents double taps), update the cached balance and visit stats in the same database transaction, write an audit entry.

**Earning (QR claim):**
1. Staff enters amount (or just "visit") → server creates a claim with a random token → counter shows a large QR code + short fallback code.
2. Customer scans → `/claim/[token]` → enters phone/email (+ consent on first join) → points credited. A claim can be used **once**, expires after 10 minutes, and is rate-limited.

**Redeeming:**
1. Logged-in customer taps a reward they can afford → server creates a pending redemption with a 6-digit code valid for 5 minutes.
2. Customer shows the code; staff types it on the counter screen → server checks it, writes a negative `redeem` ledger row, marks the redemption complete, logs who confirmed it.
3. Balance can never go below zero (enforce in the database transaction).

**Corrections:** staff can void their own earn within 10 minutes (creates a `reversal`); owners can adjust any balance with a required note. Everything is audited.

**Points never depend on payment method.** Cash and card are identical.

---

## 7. Screens (MVP)

**Customer PWA — `/s/[storeSlug]`** (mobile-first, branded with store colors/logo, installable):
- Home: greeting, points balance, progress bar to the next reward, today's/active specials, last visit.
- Rewards: list with points cost; "Redeem" shows the timed 6-digit code full-screen.
- History: earn/redeem list with dates and stores' local time.
- Profile: name, birthday (optional), email/SMS consent toggles, "Download my data", "Delete my account" (with confirmation), log out.
- "Add to Home Screen" helper banner with iOS/Android instructions.
- Not-logged-in state: explains how to earn and offers login by phone or email.

**Counter screen — `/counter/[storeSlug]`** (tablet/phone, big buttons, works one-handed, fast):
- PIN login. Auto-logout after inactivity (configurable, default 15 minutes).
- Main view: "Add points" (phone/email + amount if spend mode + optional receipt #), "Show QR claim", "Redeem code", recent transactions by this staff member with "Void" within 10 minutes.
- Clear success/error states, large text, works without page reloads.

**Owner dashboard — `/dashboard/[storeSlug]`:**
- Overview: members, new members (7/30 days), visits, returning customers, redemptions, active offers — with simple charts.
- Customers: searchable table (masked phone e.g. `•••• 0142`), detail page with history, manual adjust with note.
- Rewards: CRUD.
- Offers/specials: CRUD with image upload, scheduling, weekly recurrence, live preview of how it looks in the customer app.
- Automations: enable/configure welcome, birthday, win-back; preview message; email channel only; show sent log.
- Staff: add/remove staff, reset PIN.
- Settings: store info, timezone, currency, reward mode and rates, caps, branding (logo, colors, cover photo) with live preview.
- Export: **CSV export** of customers (with consent fields) and transactions.
- QR materials: generate a printable counter sign (PDF or print page) with the store's join QR code.

**Admin — `/admin`:** list/create stores, invite owner by email, pause store, view audit log.

All UI: accessible (labels, focus states, keyboard navigation, WCAG AA contrast), responsive, loading/empty/error states for every screen, all text through next-intl.

---

## 8. Security, privacy & reliability requirements

- RLS on every table; **automated tests that prove** an owner of Store A cannot read or change Store B's data and a customer cannot read other customers.
- Business logic runs on the server only; validate every input with Zod; never trust client-sent points or balances.
- Service-role key used only in server code, never shipped to the browser.
- Rate limiting on: OTP requests (Supabase settings), counter earn endpoint, claim creation, claim use, redemption code attempts (lock after 5 wrong codes).
- Staff PINs hashed; staff sessions scoped to one store.
- Security headers (CSP, HSTS-ready, frame-ancestors) via Next.js config.
- Privacy: customer data export (JSON) and deletion flow (deletes/anonymizes customer PII, keeps ledger rows with anonymized customer reference for store accounting). Consent stored with timestamp and source. No SMS is ever sent in the MVP.
- Data ownership: owners can export their customers and transactions at any time.
- Money stored as integer cents; never floats.
- All timestamps stored in UTC; displayed in the store's timezone.
- Sensible error handling and logging (no PII in logs; mask phones/emails).

---

## 9. Milestones (stop after each one)

1. **Setup** — check/install prerequisites (Node LTS, pnpm, Docker Desktop, Supabase CLI) and tell me what to install manually; scaffold Next.js + TS + Tailwind + shadcn/ui + ESLint/Prettier/Husky; `.vscode` config (recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Playwright, Supabase, GitLens; format on save; debug config); local Supabase running; README "how to run" section. Done when `pnpm dev` shows a starter page and `pnpm lint && pnpm typecheck && pnpm test` pass.
2. **Database** — all migrations, RLS policies, seed data (2 demo stores: "Harbor Coffee" in visits mode, "Sunset Car Wash" in spend mode; demo owner, staff PINs, customers, rewards, offers, transactions), generated types, RLS isolation tests.
3. **Auth & roles** — customer phone/email login (test OTP locally), owner magic link, staff PIN login, admin flag, route protection.
4. **Points engine** — earn (manual + QR claim), redeem, void, adjust, caps, idempotency, ledger + cached balance, audit log. Full unit test coverage of these rules.
5. **Counter screen** — complete staff flow end to end.
6. **Customer PWA** — branded store app, rewards, redemption code, history, profile, consent, install prompt, per-store manifest + service worker.
7. **Owner dashboard** — overview, customers, rewards, offers (with images), staff, settings with branding preview, CSV export, printable QR sign.
8. **Automations** — welcome, birthday, win-back via email (local dev inbox), scheduled job route (`/api/cron/automations`) protected by a secret, message log, opt-out link in every email.
9. **Admin & polish** — admin pages, i18n check (Romanian skeleton file present), accessibility pass, empty/error states, Lighthouse ≥ 90 on the customer PWA (production build).
10. **Quality & handoff** — Playwright e2e for: staff earns points → customer sees them; QR claim; redemption; owner posts offer → appears in app; cross-store isolation; data export/deletion. GitHub Actions CI. Update README (setup, demo logins, how to reset seed data, how to deploy to Vercel + Supabase Cloud later), ARCHITECTURE.md and DECISIONS.md.

---

## 10. Explicitly out of scope for the MVP (but design for it)

- POS integrations (Square → Clover → Toast). Use the `integrations` table, `source` values and `PosAdapter` interface so they plug in later.
- Stripe billing/subscriptions (table placeholder only).
- Real SMS sending, web push notifications (design the messaging interfaces so they can be added).
- Custom domains/subdomains per store (path-based now; keep `storeUrl()` helper).
- Native App Store / Play Store apps.
- Shared "all my stores" customer wallet across businesses (data model already supports it).
- Romanian translation content (structure only), RON payments, e-Factura.
- Multi-location chains under one owner (data model should not block it).

---

## 11. Definition of done for the MVP

- I can run the whole thing on my laptop with a few commands from the README.
- Using seed data, I can: log in as staff on the counter screen, add points to a customer by phone number, open the customer app on my phone (same Wi-Fi, documented), see the points, redeem a reward with the code, and see everything in the owner dashboard and CSV export.
- All tests, lint and type-check pass; CI workflow present.
- Code is organized as in section 3 and readable without explanation.

---

## Kickoff prompt (paste this into Claude Code)

```
Read MVP_SPEC.md in this folder completely. It is the source of truth for this project.
Follow section 0 "Working rules" exactly. Start by replying with:
1) your implementation plan per milestone,
2) any questions or technical concerns about the spec,
3) the exact tools I need to install on this laptop (and the commands), checking what is already installed.
Do not write code until I reply "go". Then build Milestone 1 only, and stop when it's done.
```
