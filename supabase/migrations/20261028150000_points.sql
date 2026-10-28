-- Milestone 3: rewards, the points ledger and redemptions (spec §0, §7).
-- Balances change only inside these functions, in one transaction, with the membership row
-- locked — so double taps, retries and two cashiers at once can't produce a wrong balance.

-- ───────────────────────────── rewards ─────────────────────────────

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  name text not null check (char_length(name) between 1 and 60),
  cost_points integer not null check (cost_points > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger rewards_updated_at before update on public.rewards
  for each row execute function public.set_updated_at();

-- ───────────────────────────── ledger ─────────────────────────────
-- Append-only. store_customers.points_balance is a cache of sum(points) per membership.

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  customer_id uuid not null references public.customers (id),
  type text not null check (type in ('earn', 'redeem', 'adjust', 'reversal', 'expire')),
  points integer not null check (points <> 0),
  amount_cents integer check (amount_cents >= 0),
  source text not null check (source in
    ('staff_manual', 'qr_claim', 'owner_adjust', 'system') or source like 'pos\_%'),
  staff_id uuid references public.staff (id),
  external_ref text,
  reverses_transaction_id uuid references public.point_transactions (id),
  idempotency_key text not null unique,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index point_transactions_member on public.point_transactions (store_id, customer_id, created_at desc);

-- ───────────────────────────── redemptions ─────────────────────────────

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  customer_id uuid not null references public.customers (id),
  reward_id uuid not null references public.rewards (id),
  code text not null check (code ~ '^[0-9]{6}$'),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  expires_at timestamptz not null,
  confirmed_by uuid references public.staff (id),
  completed_at timestamptz,
  transaction_id uuid references public.point_transactions (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A code can only be live once per store at a time.
create unique index redemptions_live_code on public.redemptions (store_id, code) where status = 'pending';

create trigger redemptions_updated_at before update on public.redemptions
  for each row execute function public.set_updated_at();

-- Wrong redemption codes are throttled per staff member (§4.3b: 5 wrong → locked).
alter table public.auth_throttles drop constraint auth_throttles_scope_check;
alter table public.auth_throttles add constraint auth_throttles_scope_check
  check (scope in ('customer_phone', 'staff_login', 'ip', 'redeem_code'));

-- ───────────────────────────── earn_points ─────────────────────────────
-- Staff typed a phone number: +points_per_visit. Any never-seen number becomes an 'unclaimed'
-- customer on the spot (§0 step 10). The same idempotency key twice adds points once.

create function public.earn_points(
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

  -- Optional guards (NULL for Suatu).
  if v_store.daily_earn_cap is not null then
    select coalesce(sum(points), 0) into v_earned_today from public.point_transactions
    where store_id = p_store_id and customer_id = v_customer.id and type = 'earn'
      and (created_at at time zone v_store.timezone)::date = (now() at time zone v_store.timezone)::date;
    if v_earned_today + v_store.points_per_visit > v_store.daily_earn_cap then
      raise exception 'daily_cap_reached';
    end if;
  end if;
  select max(created_at) into v_last_entry from public.point_transactions
  where store_id = p_store_id and customer_id = v_customer.id and type = 'earn';

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

-- ───────────────────────────── create_redemption ─────────────────────────────
-- Customer tapped Redeem: a 6-digit code valid 5 minutes. Points move only when staff confirm.
-- Any earlier pending code of this customer at this store is cancelled.

create function public.create_redemption(p_store_id uuid, p_customer_id uuid, p_reward_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_reward public.rewards;
  v_member public.store_customers;
  v_code text;
  v_redemption public.redemptions;
begin
  select * into v_reward from public.rewards
  where id = p_reward_id and store_id = p_store_id and active;
  if v_reward.id is null then raise exception 'reward_not_found'; end if;

  select * into v_member from public.store_customers
  where store_id = p_store_id and customer_id = p_customer_id
  for update;
  if v_member.id is null or v_member.points_balance < v_reward.cost_points then
    raise exception 'not_enough_points';
  end if;

  update public.redemptions set status = 'cancelled'
  where store_id = p_store_id and customer_id = p_customer_id and status = 'pending';

  -- Expired pending codes free their number for reuse.
  update public.redemptions set status = 'cancelled'
  where store_id = p_store_id and status = 'pending' and expires_at < now();

  loop
    v_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
    begin
      insert into public.redemptions (store_id, customer_id, reward_id, code, expires_at)
      values (p_store_id, p_customer_id, p_reward_id, v_code, now() + interval '5 minutes')
      returning * into v_redemption;
      exit;
    exception when unique_violation then
      -- That code is live for someone else right now; draw another.
    end;
  end loop;

  return jsonb_build_object(
    'id', v_redemption.id, 'code', v_redemption.code, 'expires_at', v_redemption.expires_at,
    'reward_name', v_reward.name, 'cost_points', v_reward.cost_points);
end;
$$;

-- ───────────────────────────── complete_redemption ─────────────────────────────
-- Staff typed the code. Valid, unexpired, this store, enough points → ledger row, balance down.
-- Raises 'invalid_code' for wrong, expired, used or other-store codes alike.

create function public.complete_redemption(p_store_id uuid, p_code text, p_staff_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_redemption public.redemptions;
  v_reward public.rewards;
  v_member public.store_customers;
  v_customer public.customers;
  v_transaction_id uuid;
begin
  select * into v_redemption from public.redemptions
  where store_id = p_store_id and code = p_code and status = 'pending'
  for update;
  if v_redemption.id is null or v_redemption.expires_at < now() then
    raise exception 'invalid_code';
  end if;

  select * into v_reward from public.rewards where id = v_redemption.reward_id;
  select * into v_member from public.store_customers
  where store_id = p_store_id and customer_id = v_redemption.customer_id
  for update;
  -- Balance never goes below zero.
  if v_member.points_balance < v_reward.cost_points then raise exception 'not_enough_points'; end if;

  insert into public.point_transactions
    (store_id, customer_id, type, points, source, staff_id, idempotency_key, note)
  values
    (p_store_id, v_redemption.customer_id, 'redeem', -v_reward.cost_points, 'staff_manual',
     p_staff_id, 'redemption:' || v_redemption.id, v_reward.name)
  returning id into v_transaction_id;

  update public.store_customers
  set points_balance = points_balance - v_reward.cost_points
  where id = v_member.id
  returning * into v_member;

  update public.redemptions
  set status = 'completed', confirmed_by = p_staff_id, completed_at = now(),
      transaction_id = v_transaction_id
  where id = v_redemption.id;

  select * into v_customer from public.customers where id = v_redemption.customer_id;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'reward.redeem', 'customer', v_customer.id,
          jsonb_build_object('reward', v_reward.name, 'points', -v_reward.cost_points,
                             'redemption_id', v_redemption.id));

  return jsonb_build_object(
    'reward_name', v_reward.name, 'cost_points', v_reward.cost_points,
    'customer_id', v_customer.id, 'phone_e164', v_customer.phone_e164,
    'balance', v_member.points_balance);
end;
$$;

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.rewards enable row level security;
alter table public.point_transactions enable row level security;
alter table public.redemptions enable row level security;

create policy "anyone reads active rewards" on public.rewards
  for select to anon, authenticated using (active);

create policy "customer reads own ledger" on public.point_transactions
  for select to authenticated using (
    customer_id in (select id from public.customers where auth_user_id = (select auth.uid())));

create policy "customer reads own redemptions" on public.redemptions
  for select to authenticated using (
    customer_id in (select id from public.customers where auth_user_id = (select auth.uid())));

revoke update, delete on public.point_transactions from anon, authenticated, service_role;

revoke execute on function public.earn_points from public, anon, authenticated;
revoke execute on function public.create_redemption from public, anon, authenticated;
revoke execute on function public.complete_redemption from public, anon, authenticated;
grant execute on function public.earn_points to service_role;
grant execute on function public.create_redemption to service_role;
grant execute on function public.complete_redemption to service_role;
