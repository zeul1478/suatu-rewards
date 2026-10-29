-- Milestone 7: owner dashboard (spec §7, §11): offers, owner point adjustments, overview numbers.

-- ───────────────────────────── offers ─────────────────────────────
-- Shown on the customer home while active and inside their dates (store's local calendar days).

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  title text not null check (char_length(title) between 1 and 60),
  body text check (char_length(body) <= 200),
  -- Path inside the private 'offer-images' bucket; served through the app (never a storage URL).
  image_path text,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offer_dates_in_order check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index offers_store on public.offers (store_id, sort_order, created_at);

create trigger offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;
-- No policies: offers are read and written by the server only.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-images', 'offer-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- ───────────────────────────── adjust_points ─────────────────────────────
-- A manager corrects a balance by hand (§7): a note is required, the balance never goes below
-- zero, and the same idempotency key twice adjusts once. Raises (SQLSTATE P0001):
-- 'invalid_points', 'note_required', 'not_found', 'balance_below_zero'.

create function public.adjust_points(
  p_store_id uuid, p_customer_id uuid, p_points integer, p_note text, p_staff_id uuid,
  p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_note text := btrim(coalesce(p_note, ''));
  v_member public.store_customers;
  v_existing public.point_transactions;
  v_transaction_id uuid;
begin
  if p_points = 0 or abs(p_points) > 10000 then raise exception 'invalid_points'; end if;
  if char_length(v_note) < 3 or char_length(v_note) > 200 then raise exception 'note_required'; end if;

  select * into v_existing from public.point_transactions
  where idempotency_key = 'adjust:' || p_idempotency_key;
  if v_existing.id is not null then
    select * into v_member from public.store_customers
    where store_id = v_existing.store_id and customer_id = v_existing.customer_id;
    return jsonb_build_object('duplicate', true, 'points', v_existing.points,
                              'balance', v_member.points_balance);
  end if;

  select sc.* into v_member from public.store_customers sc
  join public.customers c on c.id = sc.customer_id
  where sc.store_id = p_store_id and sc.customer_id = p_customer_id and c.status <> 'deleted'
  for update of sc;
  if v_member.id is null then raise exception 'not_found'; end if;
  if v_member.points_balance + p_points < 0 then raise exception 'balance_below_zero'; end if;

  insert into public.point_transactions
    (store_id, customer_id, type, points, source, staff_id, idempotency_key, note)
  values
    (p_store_id, p_customer_id, 'adjust', p_points, 'owner_adjust', p_staff_id,
     'adjust:' || p_idempotency_key, v_note)
  returning id into v_transaction_id;

  update public.store_customers
  set points_balance = points_balance + p_points
  where id = v_member.id
  returning * into v_member;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'points.adjust', 'customer', p_customer_id,
          jsonb_build_object('points', p_points, 'transaction_id', v_transaction_id));

  return jsonb_build_object('duplicate', false, 'points', p_points,
                            'balance', v_member.points_balance);
end;
$$;

-- ───────────────────────────── dashboard_overview ─────────────────────────────
-- The overview tiles (§11). Days are the store's local calendar days. A visit is an 'earn' row
-- that wasn't voided. "Returning" = came on two or more different days in the last 30 days.

create function public.dashboard_overview(p_store_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with store as (
    select timezone, (now() at time zone timezone)::date as today
    from public.stores where id = p_store_id
  ),
  visits as (
    select t.customer_id, (t.created_at at time zone store.timezone)::date as day
    from public.point_transactions t, store
    where t.store_id = p_store_id and t.type = 'earn'
      and not exists (select 1 from public.point_transactions r where r.reverses_transaction_id = t.id)
  ),
  members as (
    select c.status from public.store_customers sc
    join public.customers c on c.id = sc.customer_id
    where sc.store_id = p_store_id and c.status <> 'deleted'
  ),
  recent_visitors as (
    select customer_id, count(distinct day) as days
    from visits, store where day > store.today - 30
    group by customer_id
  ),
  redeemed as (
    select (r.completed_at at time zone store.timezone)::date as day
    from public.redemptions r, store
    where r.store_id = p_store_id and r.status = 'completed'
  )
  select jsonb_build_object(
    'members', (select count(*) from members),
    'signed_up', (select count(*) from members where status = 'active'),
    'visits_today', (select count(*) from visits, store where day = store.today),
    'visits_7_days', (select count(*) from visits, store where day > store.today - 7),
    'visits_30_days', (select count(*) from visits, store where day > store.today - 30),
    'visitors_30_days', (select count(*) from recent_visitors),
    'returning_30_days', (select count(*) from recent_visitors where days >= 2),
    'redeemed_total', (select count(*) from redeemed),
    'redeemed_30_days', (select count(*) from redeemed, store where day > store.today - 30)
  );
$$;

revoke execute on function public.adjust_points from public, anon, authenticated;
revoke execute on function public.dashboard_overview from public, anon, authenticated;
grant execute on function public.adjust_points to service_role;
grant execute on function public.dashboard_overview to service_role;
