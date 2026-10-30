-- Phase 2 (DECISIONS D78): stop points cheating at the counter.
-- • The owner can limit visits per customer per day and set a minimum time between visits
--   (Settings). daily_earn_cap counted points, which goes wrong when points per visit change, so
--   it becomes max_visits_per_day.
-- • A staff member can have their own phone number on file; the counter refuses to credit it.
-- • "Unusual activity" on the Overview: numbers credited 3+ times in a day, and cashiers whose
--   entries keep going to the same few numbers.

alter table public.stores rename column daily_earn_cap to max_visits_per_day;
alter table public.stores drop constraint if exists stores_daily_earn_cap_check;
alter table public.stores add constraint stores_max_visits_per_day_check
  check (max_visits_per_day between 1 and 50);
alter table public.stores add column min_minutes_between_visits integer
  check (min_minutes_between_visits between 1 and 1440);

alter table public.staff add column phone_e164 text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$');
create index staff_store_phone on public.staff (store_id, phone_e164) where phone_e164 is not null;

-- ───────────────────────────── earn_points ─────────────────────────────
-- As in 20261028150000_points.sql, with the guards above. Errors the app turns into messages:
-- staff_own_number, daily_cap_reached, too_soon:<minutes left>.

create or replace function public.earn_points(
  p_store_id uuid, p_phone_e164 text, p_staff_id uuid, p_idempotency_key text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_store public.stores;
  v_customer public.customers;
  v_member public.store_customers;
  v_existing public.point_transactions;
  v_is_new boolean := false;
  v_earned_today integer;
  v_last_entry timestamptz;
  v_transaction_id uuid;
begin
  -- Same submission again (double tap, network retry): report what happened the first time.
  select * into v_existing from public.point_transactions where idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    select * into v_member from public.store_customers
    where store_id = v_existing.store_id and customer_id = v_existing.customer_id;
    select * into v_customer from public.customers where id = v_existing.customer_id;
    return jsonb_build_object(
      'duplicate', true, 'added', 0, 'transaction_id', v_existing.id,
      'customer_id', v_customer.id, 'customer_status', v_customer.status,
      'first_name', v_customer.first_name, 'last_name', v_customer.last_name,
      'is_new_customer', false, 'balance', v_member.points_balance,
      'visit_count', v_member.visit_count);
  end if;

  select * into v_store from public.stores where id = p_store_id and status = 'active';
  if v_store.id is null then raise exception 'store_not_found'; end if;

  -- Find or create the customer. "on conflict do nothing" + re-select is safe when two cashiers
  -- enter the same new number at the same moment.
  select * into v_customer from public.customers where phone_e164 = p_phone_e164;
  if v_customer.id is null then
    insert into public.customers (status, phone_e164) values ('unclaimed', p_phone_e164)
    on conflict (phone_e164) do nothing
    returning * into v_customer;
    v_is_new := v_customer.id is not null;
    if not v_is_new then
      select * into v_customer from public.customers where phone_e164 = p_phone_e164;
    end if;
  end if;

  insert into public.store_customers (store_id, customer_id)
  values (p_store_id, v_customer.id)
  on conflict (store_id, customer_id) do nothing;

  -- The lock that serializes everything for this customer at this store.
  select * into v_member from public.store_customers
  where store_id = p_store_id and customer_id = v_customer.id
  for update;

  -- A cashier can't credit a number that belongs to someone on the store's staff (D78).
  if exists (select 1 from public.staff s
             where s.store_id = p_store_id and s.active and s.phone_e164 = p_phone_e164) then
    raise exception 'staff_own_number';
  end if;

  -- The owner's limits (D78), off unless set. Voided visits don't count.
  if v_store.max_visits_per_day is not null then
    select count(*) into v_earned_today from public.point_transactions t
    where t.store_id = p_store_id and t.customer_id = v_customer.id and t.type = 'earn'
      and (t.created_at at time zone v_store.timezone)::date = (now() at time zone v_store.timezone)::date
      and not exists (select 1 from public.point_transactions r where r.reverses_transaction_id = t.id);
    if v_earned_today >= v_store.max_visits_per_day then
      raise exception 'daily_cap_reached';
    end if;
  end if;
  select max(t.created_at) into v_last_entry from public.point_transactions t
  where t.store_id = p_store_id and t.customer_id = v_customer.id and t.type = 'earn'
    and not exists (select 1 from public.point_transactions r where r.reverses_transaction_id = t.id);
  if v_store.min_minutes_between_visits is not null and v_last_entry is not null
     and now() - v_last_entry < make_interval(mins => v_store.min_minutes_between_visits) then
    raise exception 'too_soon:%',
      ceil(extract(epoch from v_last_entry + make_interval(mins => v_store.min_minutes_between_visits) - now()) / 60)::integer;
  end if;

  begin
    insert into public.point_transactions
      (store_id, customer_id, type, points, source, staff_id, idempotency_key)
    values
      (p_store_id, v_customer.id, 'earn', v_store.points_per_visit, 'staff_manual', p_staff_id,
       p_idempotency_key)
    returning id into v_transaction_id;
  exception when unique_violation then
    -- The same key won a race in another transaction: treat as the duplicate it is.
    return public.earn_points(p_store_id, p_phone_e164, p_staff_id, p_idempotency_key);
  end;

  update public.store_customers
  set points_balance = points_balance + v_store.points_per_visit,
      visit_count = visit_count + 1,
      last_visit_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'points.earn', 'customer', v_customer.id,
          jsonb_build_object('points', v_store.points_per_visit, 'new_customer', v_is_new,
                             'transaction_id', v_transaction_id));

  return jsonb_build_object(
    'duplicate', false, 'added', v_store.points_per_visit, 'transaction_id', v_transaction_id,
    'customer_id', v_customer.id, 'customer_status', v_customer.status,
    'first_name', v_customer.first_name, 'last_name', v_customer.last_name,
    'is_new_customer', v_is_new, 'balance', v_member.points_balance,
    'visit_count', v_member.visit_count,
    'seconds_since_last_entry',
      case when v_last_entry is null then null else extract(epoch from now() - v_last_entry)::integer end,
    'repeat_warning',
      v_store.repeat_entry_warning_seconds is not null and v_last_entry is not null
      and now() - v_last_entry < make_interval(secs => v_store.repeat_entry_warning_seconds));
end;
$$;

-- ───────────────────────────── unusual activity ─────────────────────────────
-- For the owner's Overview. Phones are returned whole; the app masks them (src/lib/phone.ts).

create function public.dashboard_unusual_activity(p_store_id uuid, p_days integer default 7)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with store as (
    select timezone from public.stores where id = p_store_id
  ),
  visits as (
    select t.customer_id, t.staff_id, (t.created_at at time zone store.timezone)::date as day
    from public.point_transactions t, store
    where t.store_id = p_store_id and t.type = 'earn'
      and t.created_at >= now() - make_interval(days => p_days)
      and not exists (select 1 from public.point_transactions r where r.reverses_transaction_id = t.id)
  ),
  busy_numbers as (
    select v.customer_id, v.day, count(*) as visits
    from visits v group by v.customer_id, v.day having count(*) >= 3
  ),
  numbers as (
    select b.customer_id, max(b.visits) as most_in_a_day, count(*) as days,
           c.phone_e164, c.first_name, c.last_name, c.status
    from busy_numbers b join public.customers c on c.id = b.customer_id
    group by b.customer_id, c.phone_e164, c.first_name, c.last_name, c.status
    order by max(b.visits) desc, count(*) desc
    limit 10
  ),
  per_cashier as (
    select v.staff_id, v.customer_id, count(*) as visits
    from visits v where v.staff_id is not null group by v.staff_id, v.customer_id
  ),
  cashiers as (
    select p.staff_id, s.display_name, sum(p.visits) as visits,
           (select sum(top.visits) from (
              select p2.visits from per_cashier p2 where p2.staff_id = p.staff_id
              order by p2.visits desc limit 3) top) as top_three
    from per_cashier p join public.staff s on s.id = p.staff_id
    group by p.staff_id, s.display_name
  )
  select jsonb_build_object(
    'numbers', coalesce((select jsonb_agg(jsonb_build_object(
        'customer_id', customer_id, 'phone', phone_e164, 'first_name', first_name,
        'last_name', last_name, 'status', status, 'most_in_a_day', most_in_a_day, 'days', days))
      from numbers), '[]'::jsonb),
    -- A cashier with 10+ entries, more than half of them to the same three numbers.
    'cashiers', coalesce((select jsonb_agg(jsonb_build_object(
        'staff_id', staff_id, 'name', display_name, 'visits', visits, 'top_three', top_three)
        order by top_three::numeric / visits desc)
      from cashiers where visits >= 10 and top_three * 2 > visits), '[]'::jsonb)
  );
$$;

revoke execute on function public.dashboard_unusual_activity from public, anon, authenticated;
grant execute on function public.dashboard_unusual_activity to service_role;
