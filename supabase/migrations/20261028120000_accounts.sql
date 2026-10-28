-- Milestone 2: stores, customers, consent records, staff, login throttling, audit log.
-- Every table has RLS enabled. The Next.js server uses the secret key for privileged work and a
-- customer-scoped client (RLS applies) for reading a customer's own rows. Browsers never connect.

-- ───────────────────────────── helpers ─────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ───────────────────────────── stores ─────────────────────────────

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  country text not null check (country ~ '^[A-Z]{2}$'),
  timezone text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  locale text not null,
  reward_mode text not null default 'visits' check (reward_mode in ('visits', 'spend')),
  points_per_visit integer not null default 5 check (points_per_visit > 0),
  points_per_currency_unit numeric check (points_per_currency_unit > 0),
  daily_earn_cap integer check (daily_earn_cap > 0),
  repeat_entry_warning_seconds integer check (repeat_entry_warning_seconds > 0),
  max_amount_per_transaction_cents integer check (max_amount_per_transaction_cents > 0),
  branding jsonb not null default '{}'::jsonb,
  address text,
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stores_updated_at before update on public.stores
  for each row execute function public.set_updated_at();

-- ───────────────────────────── customers ─────────────────────────────
-- status: 'unclaimed' = created by a staff entry (no login yet), 'active' = signed up,
-- 'deleted' = anonymized (PII cleared, ledger rows kept).

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('unclaimed', 'active', 'deleted')),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  phone_e164 text unique check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email text check (email = lower(email)),
  first_name text check (char_length(first_name) between 1 and 50),
  last_name text check (char_length(last_name) between 1 and 50),
  is_adult_confirmed boolean not null default false,
  email_verified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_customer_is_complete check (
    status <> 'active'
    or (auth_user_id is not null and phone_e164 is not null and email is not null
        and first_name is not null and last_name is not null and is_adult_confirmed)
  )
);

create unique index customers_email_unique on public.customers (email) where email is not null;

create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

create table public.store_customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  customer_id uuid not null references public.customers (id),
  joined_at timestamptz not null default now(),
  last_visit_at timestamptz,
  visit_count integer not null default 0 check (visit_count >= 0),
  points_balance integer not null default 0 check (points_balance >= 0),
  program_terms_accepted_at timestamptz,
  program_terms_version text,
  privacy_accepted_at timestamptz,
  privacy_version text,
  marketing_email_consent boolean not null default false,
  marketing_email_consent_at timestamptz,
  marketing_email_consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, customer_id)
);

create trigger store_customers_updated_at before update on public.store_customers
  for each row execute function public.set_updated_at();

-- Append-only record of what was accepted, which version, when and from which screen (§8).
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  store_id uuid references public.stores (id),
  kind text not null check (kind in
    ('program_terms', 'privacy_policy', 'terms_of_use', 'age_18_plus', 'marketing_email')),
  document_version text,
  granted boolean not null,
  source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consent_events_customer on public.consent_events (customer_id, created_at);

create table public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── staff ─────────────────────────────
-- Staff are not Supabase Auth users: they log in with a store-scoped code + argon2id password.
-- Failed attempts and lockouts live in auth_throttles (shared with customer logins).

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  staff_code text not null check (staff_code ~ '^[A-Za-z0-9]{4,32}$'),
  role text not null check (role in ('cashier', 'manager')),
  display_name text not null,
  password_hash text not null,
  active boolean not null default true,
  must_change_password boolean not null default false,
  is_platform_admin boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, staff_code)
);

create trigger staff_updated_at before update on public.staff
  for each row execute function public.set_updated_at();

create table public.staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id),
  store_id uuid not null references public.stores (id),
  token_hash text not null unique,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────────── login throttling ─────────────────────────────

create table public.auth_throttles (
  scope text not null check (scope in ('customer_phone', 'staff_login', 'ip')),
  key text not null,
  failed_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, key)
);

create trigger auth_throttles_updated_at before update on public.auth_throttles
  for each row execute function public.set_updated_at();

-- Returns when the key is locked until, or null when it isn't locked.
create function public.auth_throttle_locked_until(p_scope text, p_key text)
returns timestamptz
language sql stable security definer set search_path = '' as $$
  select locked_until from public.auth_throttles
  where scope = p_scope and key = p_key and locked_until > now();
$$;

-- Records one failure. Failures older than p_window start a new count. Reaching p_max locks the
-- key for p_lock and resets the count. Returns locked_until when this failure caused a lock.
create function public.auth_throttle_fail(
  p_scope text, p_key text, p_max integer, p_window interval, p_lock interval)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.auth_throttles;
begin
  insert into public.auth_throttles (scope, key, failed_count, window_started_at)
  values (p_scope, p_key, 0, now())
  on conflict (scope, key) do nothing;

  select * into v_row from public.auth_throttles
  where scope = p_scope and key = p_key for update;

  if v_row.window_started_at < now() - p_window then
    v_row.failed_count := 0;
    v_row.window_started_at := now();
  end if;

  v_row.failed_count := v_row.failed_count + 1;

  if v_row.failed_count >= p_max then
    update public.auth_throttles
    set failed_count = 0, window_started_at = now(), locked_until = now() + p_lock
    where scope = p_scope and key = p_key;
    return now() + p_lock;
  end if;

  update public.auth_throttles
  set failed_count = v_row.failed_count, window_started_at = v_row.window_started_at
  where scope = p_scope and key = p_key;
  return null;
end;
$$;

create function public.auth_throttle_clear(p_scope text, p_key text)
returns void
language sql security definer set search_path = '' as $$
  delete from public.auth_throttles where scope = p_scope and key = p_key;
$$;

-- ───────────────────────────── audit log ─────────────────────────────

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores (id),
  actor_type text not null check (actor_type in ('customer', 'staff', 'system')),
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audit_log_store_time on public.audit_log (store_id, created_at desc);

-- ───────────────────────────── customer sign-up ─────────────────────────────
-- Creates the customer, or claims the 'unclaimed' account a staff entry created for this phone
-- (§0 step 11). Joins the store and records every consent. One transaction.
-- Raises 'phone_taken' or 'email_taken' (SQLSTATE P0001) for the caller to map to field errors.

create function public.register_customer(
  p_auth_user_id uuid,
  p_store_id uuid,
  p_phone_e164 text,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_program_terms_version text,
  p_privacy_version text,
  p_terms_of_use_version text,
  p_marketing_email boolean,
  p_source text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_customer public.customers;
  v_claimed boolean := false;
begin
  select * into v_customer from public.customers where phone_e164 = p_phone_e164 for update;

  if v_customer.id is not null and v_customer.status <> 'unclaimed' then
    raise exception 'phone_taken';
  end if;

  if exists (select 1 from public.customers
             where email = lower(p_email) and (v_customer.id is null or id <> v_customer.id)) then
    raise exception 'email_taken';
  end if;

  if v_customer.id is not null then
    v_claimed := true;
    update public.customers
    set status = 'active', auth_user_id = p_auth_user_id, email = lower(p_email),
        first_name = p_first_name, last_name = p_last_name, is_adult_confirmed = true
    where id = v_customer.id
    returning * into v_customer;
  else
    insert into public.customers
      (status, auth_user_id, phone_e164, email, first_name, last_name, is_adult_confirmed)
    values
      ('active', p_auth_user_id, p_phone_e164, lower(p_email), p_first_name, p_last_name, true)
    returning * into v_customer;
  end if;

  insert into public.store_customers (
    store_id, customer_id,
    program_terms_accepted_at, program_terms_version, privacy_accepted_at, privacy_version,
    marketing_email_consent, marketing_email_consent_at, marketing_email_consent_source)
  values (
    p_store_id, v_customer.id,
    now(), p_program_terms_version, now(), p_privacy_version,
    p_marketing_email, now(), p_source)
  on conflict (store_id, customer_id) do update set
    program_terms_accepted_at = excluded.program_terms_accepted_at,
    program_terms_version = excluded.program_terms_version,
    privacy_accepted_at = excluded.privacy_accepted_at,
    privacy_version = excluded.privacy_version,
    marketing_email_consent = excluded.marketing_email_consent,
    marketing_email_consent_at = excluded.marketing_email_consent_at,
    marketing_email_consent_source = excluded.marketing_email_consent_source;

  insert into public.consent_events (customer_id, store_id, kind, document_version, granted, source)
  values
    (v_customer.id, p_store_id, 'program_terms', p_program_terms_version, true, p_source),
    (v_customer.id, null, 'privacy_policy', p_privacy_version, true, p_source),
    (v_customer.id, null, 'terms_of_use', p_terms_of_use_version, true, p_source),
    (v_customer.id, null, 'age_18_plus', null, true, p_source),
    (v_customer.id, p_store_id, 'marketing_email', null, p_marketing_email, p_source);

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'customer', v_customer.id, 'customer.signup', 'customer', v_customer.id,
          jsonb_build_object('claimed_existing', v_claimed));

  return v_customer.id;
end;
$$;

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.stores enable row level security;
alter table public.customers enable row level security;
alter table public.store_customers enable row level security;
alter table public.consent_events enable row level security;
alter table public.email_verifications enable row level security;
alter table public.staff enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.auth_throttles enable row level security;
alter table public.audit_log enable row level security;

-- A signed-in customer can read their own customer row and memberships. Nothing else is
-- readable or writable with the browser-safe key; all writes go through the server.
create policy "customer reads own row" on public.customers
  for select to authenticated using (auth_user_id = (select auth.uid()));

create policy "customer reads own memberships" on public.store_customers
  for select to authenticated using (
    customer_id in (select id from public.customers where auth_user_id = (select auth.uid())));

create policy "anyone reads active stores" on public.stores
  for select to anon, authenticated using (status = 'active');

-- Ledger-style tables are append-only, even for the server.
revoke update, delete on public.consent_events, public.audit_log from anon, authenticated, service_role;

-- Functions are callable only by the server (secret key).
revoke execute on function public.register_customer from public, anon, authenticated;
revoke execute on function public.auth_throttle_locked_until from public, anon, authenticated;
revoke execute on function public.auth_throttle_fail from public, anon, authenticated;
revoke execute on function public.auth_throttle_clear from public, anon, authenticated;
grant execute on function public.register_customer to service_role;
grant execute on function public.auth_throttle_locked_until to service_role;
grant execute on function public.auth_throttle_fail to service_role;
grant execute on function public.auth_throttle_clear to service_role;
