-- Development seed. Fictional data only (spec §1.6). Never run against production.
-- Demo customers are added by scripts/seed-demo.mjs (they need Supabase Auth accounts).

insert into public.stores
  (slug, name, country, timezone, currency, locale, reward_mode, points_per_visit,
   daily_earn_cap, repeat_entry_warning_seconds, address, branding)
values
  ('suatu', 'Suatu', 'US', 'America/New_York',
   'USD', 'en-US', 'visits', 5, null, null, '[MAILING ADDRESS]',
   '{"primary": "#1E7A4F", "accent": "#C6F06A"}'::jsonb);

-- The single non-customer account (spec §6, DECISIONS D2): user name 0000, password 0000.
-- Manager role + platform admin, development only. Production builds refuse this password.
insert into public.staff
  (store_id, staff_code, role, display_name, password_hash, is_platform_admin)
select id, '0000', 'manager', 'Manager (dev)',
  '$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA',
  true
from public.stores where slug = 'suatu';
