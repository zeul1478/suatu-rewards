-- Milestone 8: platform admin (/admin, spec §11): stores, owners, audit log; two more rate
-- limits from the security review (sign-ups per IP, reset emails per phone).
-- Admins are behappy's own people, not a store's staff: their own accounts and sessions, no
-- store attached. The `staff.is_platform_admin` flag from M2 was never used and is replaced.

-- ───────────────────────────── platform admins ─────────────────────────────

create table public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[A-Za-z0-9]{4,32}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  password_hash text not null,
  active boolean not null default true,
  must_change_password boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger platform_admins_updated_at before update on public.platform_admins
  for each row execute function public.set_updated_at();

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.platform_admins (id),
  token_hash text not null unique,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_sessions_updated_at before update on public.admin_sessions
  for each row execute function public.set_updated_at();

alter table public.platform_admins enable row level security;
alter table public.admin_sessions enable row level security;
-- No policies: read and written by the server only.

alter table public.staff drop column is_platform_admin;

alter table public.audit_log drop constraint audit_log_actor_type_check;
alter table public.audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('customer', 'staff', 'admin', 'system'));

-- The admin audit page lists every store's entries newest first.
create index audit_log_time on public.audit_log (created_at desc);

alter table public.auth_throttles drop constraint auth_throttles_scope_check;
alter table public.auth_throttles add constraint auth_throttles_scope_check
  check (scope in ('customer_phone', 'staff_login', 'admin_login', 'ip', 'redeem_code',
                   'signup_ip', 'reset_email'));

-- ───────────────────────────── admin_store_summaries ─────────────────────────────
-- One row per store for the admin's store list. Visits = 'earn' rows that weren't voided.

create function public.admin_store_summaries()
returns table (
  id uuid, slug text, name text, country text, locale text, timezone text, status text,
  created_at timestamptz,
  members bigint, staff bigint, visits_30_days bigint, last_visit_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.id, s.slug, s.name, s.country, s.locale, s.timezone, s.status, s.created_at,
    (select count(*) from public.store_customers sc
     join public.customers c on c.id = sc.customer_id
     where sc.store_id = s.id and c.status <> 'deleted'),
    (select count(*) from public.staff st where st.store_id = s.id and st.active),
    (select count(*) from public.point_transactions t
     where t.store_id = s.id and t.type = 'earn' and t.created_at > now() - interval '30 days'
       and not exists (select 1 from public.point_transactions r
                       where r.reverses_transaction_id = t.id)),
    (select max(sc.last_visit_at) from public.store_customers sc where sc.store_id = s.id)
  from public.stores s
  order by s.created_at;
$$;

-- ───────────────────────────── create_store ─────────────────────────────
-- A new store with its first owner (a manager who must choose their own password at first
-- login) and the starter reward, all or nothing. The password hash is made by the server
-- (argon2id). Raises (SQLSTATE P0001) 'slug_taken'.

create function public.create_store(
  p_slug text, p_name text, p_country text, p_timezone text, p_currency text, p_locale text,
  p_points_per_visit integer, p_owner_code text, p_owner_name text, p_owner_password_hash text,
  p_admin_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_store_id uuid;
  v_owner_id uuid;
begin
  if exists (select 1 from public.stores where slug = p_slug) then
    raise exception 'slug_taken';
  end if;

  insert into public.stores (slug, name, country, timezone, currency, locale, points_per_visit)
  values (p_slug, p_name, p_country, p_timezone, p_currency, p_locale, p_points_per_visit)
  returning id into v_store_id;

  insert into public.rewards (store_id, name, cost_points)
  values (v_store_id, 'Free coffee', 100);

  insert into public.staff
    (store_id, staff_code, role, display_name, password_hash, must_change_password)
  values (v_store_id, p_owner_code, 'manager', p_owner_name, p_owner_password_hash, true)
  returning id into v_owner_id;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (v_store_id, 'admin', p_admin_id, 'store.created', 'store', v_store_id,
          jsonb_build_object('slug', p_slug, 'owner_id', v_owner_id));

  return v_store_id;
end;
$$;

revoke execute on function public.admin_store_summaries from public, anon, authenticated;
revoke execute on function public.create_store from public, anon, authenticated;
grant execute on function public.admin_store_summaries to service_role;
grant execute on function public.create_store to service_role;
