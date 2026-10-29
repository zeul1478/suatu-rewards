# Deploying Suatu Rewards

How to run this app for real: the web app on **Vercel**, the database on **Supabase Cloud**, email through a real provider. This is a plan: nothing has been deployed yet. Read **"Must change before real customers"** first. Several items there are launch blockers, not polish.

## What runs where

| Piece                                          | Locally (today)                      | Production                                                   |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------------ |
| Web app (Next.js 16, Node 24)                  | `pnpm dev` / `pnpm dev:lan`          | Vercel project, Node 24                                      |
| Database, logins, picture storage, nightly job | Supabase in Docker (`pnpm db:start`) | Supabase Cloud project (Postgres 17, Auth, Storage, pg_cron) |
| Email (password reset, email confirmation)     | Mailpit (catches everything)         | SMTP of an email provider (Resend, Postmark, SES…)           |
| SMS                                            | none                                 | none yet (see D4: needed before launch)                      |

## 1. Supabase Cloud

1. Create a project (closest region to the stores, e.g. `us-east-1`). Keep the database password somewhere safe.
2. Link and push the schema from the laptop:
   ```bash
   pnpm exec supabase login
   pnpm exec supabase link --project-ref <project-ref>
   pnpm exec supabase db push        # applies supabase/migrations/*.sql — NOT seed.sql
   ```
   The seed (Suatu, `0000` accounts) is development-only and is never pushed. The migrations create the `offer-images` storage bucket, the nightly retention job (pg_cron) and every function.
3. **Auth settings** (Dashboard → Authentication). `supabase/config.toml` is for local only, so set these by hand:
   - **Phone provider: on**, with "confirm phone" off. Supabase only allows phone + password login when an SMS provider is filled in. The app never sends SMS (D17), so the local setup uses placeholder Twilio values. Do the same, or add the real provider once SMS verification is built (D4).
   - **Email provider: on**, "confirm email" off (the app sends its own confirmation emails), "secure email change" on.
   - **Minimum password length: 8.** The app enforces its own rules too.
   - **Rate limits:** raise "sign-ups and sign-ins" and "token verifications" well above the defaults. Every login reaches Supabase from Vercel's servers, so Supabase's per-IP limit would treat all customers as one person. The app has its own per-phone and per-IP limits (D67).
   - **Site URL:** the app's address, e.g. `https://rewards.suatu.com`.
4. Note from Project Settings → API: the **project URL**, the **publishable key** and the **secret key**. The secret key is a master key: it goes only into Vercel's environment settings, never into code or chat.
5. **Backups:** daily backups come with paid plans; point-in-time recovery is an add-on. Decide before real points are at stake.

## 2. Email provider

Any provider with SMTP works without code changes. Example with Resend:

1. Verify the sending domain (SPF + DKIM records in the domain's DNS).
2. Use host `smtp.resend.com`, port `465`, `SMTP_SECURE=true`, user `resend`, password = an API key.
3. `EMAIL_FROM` must use the verified domain, e.g. `Suatu Rewards <no-reply@rewards.suatu.com>`.

Marketing emails aren't built (only the opt-in is recorded). When they are, CAN-SPAM requires an unsubscribe link and the store's postal address in every one (§8).

## 3. Vercel

1. Push the repository to GitHub (CI runs on every push: `.github/workflows/ci.yml`), then **Import** it in Vercel. Framework: Next.js. Install command: `pnpm install --frozen-lockfile`. Node.js version: 24.
2. **Environment variables** (Production):

   | Variable                                                              | Value                                                              |
   | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
   | `APP_URL`                                                             | `https://rewards.suatu.com` — required: every emailed link uses it |
   | `SUPABASE_URL`                                                        | project URL                                                        |
   | `SUPABASE_PUBLISHABLE_KEY`                                            | publishable key                                                    |
   | `SUPABASE_SECRET_KEY`                                                 | secret key (mark as sensitive)                                     |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | from the email provider                                            |
   | `EMAIL_FROM`                                                          | sender on the verified domain                                      |
   | `LOGIN_MAX_FAILURES_PER_IP`                                           | optional, default 30 (per 15 minutes)                              |

   `DATABASE_URL`, `MAILPIT_URL` and `SUPABASE_STUDIO_URL` are only for tests and scripts on the laptop.

3. Add the custom domain. HTTPS is automatic; the app sends HSTS in production (2 years, subdomains), so the domain must stay HTTPS.
4. Deploy. Then check: `/s/<store>/signup` loads, and `/` and `/dev/root-ca` return 404 (development only).

## 4. First admin and first store

1. Create the first admin from the laptop, pointing at the cloud database (Project Settings → Database → connection string, "session" mode):
   ```bash
   DATABASE_URL="postgresql://…" pnpm admin:create mihai "Mihai"
   ```
   It prints a temporary password once. The first login at `/admin` asks for a new one.
2. In `/admin` → **Add a store**: the store's address (`suatu`), location, points per visit and its first owner. The owner logs in at `/dashboard/<store>` and chooses their own password.
3. The look: a store whose address matches a brand file (`src/brands/suatu.ts`) gets that brand; others get the default until one is added (`pnpm brand:sync`, D33), committed and deployed.
4. Print the counter sign from the owner's dashboard (Counter sign → Print) and put it by the register **before** cashiers start typing customers' numbers (D5, D62).

## Must change before real customers

Launch blockers (decisions marked ⚖ in `docs/DECISIONS.md`):

- [ ] **Legal review** of the three documents in `legal/` (privacy policy, terms of use, program terms): fill `[SUATU LEGAL BUSINESS NAME]` and `[MAILING ADDRESS]`, remove the "Demo — not for real customers" banners, and bump their versions. Customers then re-accept them (consents are versioned).
- [ ] **SMS verification of phone numbers** (D4). Today anyone can sign up with someone else's number and take its points; "release number" (D58) is only a manual fix.
- [ ] **Retention** (D5): unclaimed accounts idle for 12 months are erased nightly. Confirm 12 months with the lawyer, and that the counter sign works as the notice at collection.
- [ ] **Romanian** (`src/messages/ro.json`, D66): a native speaker reviews it before any Romanian store goes live. Romanian legal texts and GDPR basics (lawful basis, DPA per business) are not done.
- [ ] **Store address** for each store (`stores.address`, needed for marketing email; the admin form doesn't ask for it yet).

Security and operations:

- [ ] `APP_URL` set (the app refuses to start without it in production).
- [ ] The per-IP limits trust `x-forwarded-for`, which Vercel sets. On another host, revisit `src/server/request.ts` (D67).
- [ ] Error tracking and log alerts (e.g. Vercel log drains or Sentry): none are set up. Logs never contain phone numbers or emails (D67), so they can go to a third party.
- [ ] Decide on HSTS preload (only once the domain is HTTPS for good).
- [ ] Rotate the Supabase secret key if it was ever pasted anywhere outside Vercel.
- [ ] Admin accounts: only `pnpm admin:create` adds them; there's no admin screen to remove one (set `platform_admins.active = false` in the Supabase table editor).

Out of scope for the MVP, designed for later (§13): POS integrations, QR self-claim, spend-based points, billing, push notifications, native apps.

## Updating

Migrations: add a new file in `supabase/migrations/` (never edit one that's been pushed), test locally with `pnpm db:reset`, merge, then `pnpm exec supabase db push`. Push database changes **before** deploying code that needs them. The app: merging to `main` deploys on Vercel once CI is green.
