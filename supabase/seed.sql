-- Development seed. Fictional data only (spec §1.6). Never run against production.
-- Demo customers are added by scripts/seed-demo.mjs (they need Supabase Auth accounts).

insert into public.stores
  (slug, name, country, timezone, currency, locale, reward_mode, points_per_visit,
   max_visits_per_day, repeat_entry_warning_seconds, address, branding)
values
  ('suatu', 'Suatu', 'US', 'America/New_York',
   'USD', 'en-US', 'visits', 5, null, null, '[MAILING ADDRESS]',
   '{"primary": "#1E7A4F", "accent": "#C6F06A"}'::jsonb);

-- The dev-only non-customer login (spec §6, DECISIONS D2, D64): user name 0000, password 0000,
-- for the counter screen and owner dashboard (a manager of Suatu) and for /admin (a platform
-- admin account with the same name and password). Production builds refuse this password.
insert into public.staff (store_id, staff_code, role, display_name, password_hash)
select id, '0000', 'manager', 'Manager (dev)',
  '$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA'
from public.stores where slug = 'suatu';

insert into public.platform_admins (username, display_name, password_hash)
values ('0000', 'Admin (dev)',
  '$argon2id$v=19$m=19456,t=2,p=1$NNMgCqOF1rmfLkaR9/w2bA$Pxnqh73ohMyiTIiaO5sVU8UxDKi+GxPbfeUGbUtH+OA');

-- Rewards named after what Suatu really sells (suatu.ro: the station's coffee shop and snacks,
-- the restaurant's wood-fired pizza). The coffee at 100 points = 20 visits (spec §0).
insert into public.rewards (store_id, name, cost_points, sort_order)
select id, reward.name, reward.cost, reward.sort
from public.stores,
  (values ('Free Suatu coffee', 100, 0),
          ('Snack and drink from our shop', 150, 1),
          ('Wood-fired pizza at our restaurant', 300, 3)) as reward (name, cost, sort)
where slug = 'suatu';
