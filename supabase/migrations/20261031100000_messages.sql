-- Messages and reward rules (DECISIONS D84). The owner chooses, per event, whether customers get
-- a text and/or an email and what it says; special messages go to a chosen group. Everything is
-- off until the owner turns it on, and texts need the customer's own opt-in.
--
-- Event messages are queued here (triggers, the hourly job) as "intents": who, which event and a
-- few values. The app writes the words at send time from the owner's current template, sends
-- them and records the result on the same row (the outbox doubles as the log).

-- Reward rules: all off (null) by default.
alter table public.stores
  add column welcome_bonus_points integer check (welcome_bonus_points between 1 and 10000),
  add column birthday_bonus_points integer check (birthday_bonus_points between 1 and 10000),
  add column double_points_multiplier integer check (double_points_multiplier between 2 and 5),
  add column double_points_from date,
  add column double_points_to date,
  add column points_expire_after_months integer check (points_expire_after_months between 3 and 36),
  add constraint double_points_dates check (
    double_points_multiplier is null
    or (double_points_from is not null and double_points_to is not null
        and double_points_from <= double_points_to));

-- Text-message opt-ins, kept apart from offer emails: texts about the customer's own points
-- ("updates") and offer texts ("marketing"). US law (TCPA) wants each asked for separately.
alter table public.store_customers
  add column sms_updates_consent boolean not null default false,
  add column sms_updates_consent_at timestamptz,
  add column sms_marketing_consent boolean not null default false,
  add column sms_marketing_consent_at timestamptz,
  add column birthday_rewarded_year integer;

alter table public.consent_events drop constraint consent_events_kind_check;
alter table public.consent_events add constraint consent_events_kind_check check (kind in (
  'program_terms', 'privacy_policy', 'terms_of_use', 'age_18_plus', 'marketing_email',
  'sms_updates', 'sms_marketing'));

create function public.set_sms_consent(
  p_store_id uuid, p_customer_id uuid, p_kind text, p_granted boolean, p_source text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_kind = 'sms_updates' then
    update public.store_customers
    set sms_updates_consent = p_granted, sms_updates_consent_at = now()
    where store_id = p_store_id and customer_id = p_customer_id;
  elsif p_kind = 'sms_marketing' then
    update public.store_customers
    set sms_marketing_consent = p_granted, sms_marketing_consent_at = now()
    where store_id = p_store_id and customer_id = p_customer_id;
  else
    raise exception 'unknown_consent_kind';
  end if;
  insert into public.consent_events (customer_id, store_id, kind, document_version, granted, source)
  values (p_customer_id, p_store_id, p_kind, null, p_granted, p_source);
end;
$$;

-- The owner's wording, per event and channel. No row = off (the app shows a default to start from).
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  event text not null check (event in (
    'welcome', 'visit_added', 'reward_unlocked', 'reward_used', 'birthday', 'we_miss_you',
    'points_expiring')),
  channel text not null check (channel in ('sms', 'email')),
  enabled boolean not null default false,
  subject text check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, event, channel)
);
create trigger message_templates_updated_at before update on public.message_templates
  for each row execute function public.set_updated_at();

-- Special messages the owner sends to a group.
create table public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  channel text not null check (channel in ('sms', 'email')),
  audience text not null check (audience in ('all', 'lapsed_30', 'reward_waiting', 'birthday_month')),
  subject text check (char_length(subject) <= 120),
  body text not null check (char_length(body) between 1 and 1000),
  recipients integer not null default 0,
  created_by uuid references public.staff (id),
  created_at timestamptz not null default now()
);

-- Outbox and log in one: queued → sending → sent | failed | skipped. The address is looked up at
-- send time (so a deleted account gets nothing) and kept only masked; to_address is used for a
-- manager's "send me a test" only.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id),
  customer_id uuid references public.customers (id),
  broadcast_id uuid references public.broadcasts (id),
  channel text not null check (channel in ('sms', 'email')),
  event text,
  payload jsonb not null default '{}'::jsonb,
  to_address text,
  to_masked text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (customer_id is not null or to_address is not null)
);
create index messages_due on public.messages (send_after) where status = 'queued';
create index messages_store_recent on public.messages (store_id, created_at desc);
create trigger messages_updated_at before update on public.messages
  for each row execute function public.set_updated_at();

alter table public.message_templates enable row level security;
alter table public.broadcasts enable row level security;
alter table public.messages enable row level security;

-- Which events are offers (need a marketing opt-in) rather than news about the customer's points.
create function public.is_marketing_event(p_event text) returns boolean
language sql immutable set search_path = '' as $$
  select p_event in ('birthday', 'we_miss_you');
$$;

-- Queue one event for one customer on every channel the owner turned on and the customer may get.
create function public.queue_event_message(
  p_store_id uuid, p_customer_id uuid, p_event text, p_payload jsonb default '{}'::jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_customer public.customers;
  v_member public.store_customers;
  v_template record;
  v_marketing boolean := public.is_marketing_event(p_event);
  v_count integer := 0;
begin
  select * into v_customer from public.customers where id = p_customer_id and status = 'active';
  if v_customer.id is null then return 0; end if;
  select * into v_member from public.store_customers
  where store_id = p_store_id and customer_id = p_customer_id;
  if v_member.id is null then return 0; end if;

  for v_template in
    select channel from public.message_templates
    where store_id = p_store_id and event = p_event and enabled
  loop
    if v_template.channel = 'sms' and v_customer.phone_e164 is not null
       and (case when v_marketing then v_member.sms_marketing_consent
                 else v_member.sms_updates_consent end)
    or v_template.channel = 'email' and v_customer.email is not null
       and (not v_marketing or v_member.marketing_email_consent)
    then
      insert into public.messages (store_id, customer_id, channel, event, payload)
      values (p_store_id, p_customer_id, v_template.channel, p_event, p_payload);
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- A visit or bonus raised the balance: "+5 points", and "your reward is ready" when it crosses
-- the price of an active reward.
create function public.queue_balance_messages() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_reward text;
begin
  if new.visit_count > old.visit_count then
    perform public.queue_event_message(new.store_id, new.customer_id, 'visit_added',
      jsonb_build_object('points_added', new.points_balance - old.points_balance));
  end if;
  if new.points_balance > old.points_balance then
    select name into v_reward from public.rewards
    where store_id = new.store_id and active
      and cost_points > old.points_balance and cost_points <= new.points_balance
    order by cost_points desc limit 1;
    if v_reward is not null then
      perform public.queue_event_message(new.store_id, new.customer_id, 'reward_unlocked',
        jsonb_build_object('reward', v_reward));
    end if;
  end if;
  return new;
end;
$$;
create trigger store_customers_queue_messages after update of points_balance, visit_count
  on public.store_customers for each row execute function public.queue_balance_messages();

create function public.queue_redemption_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'completed' and old.status <> 'completed' then
    perform public.queue_event_message(new.store_id, new.customer_id, 'reward_used',
      jsonb_build_object('reward', (select name from public.rewards where id = new.reward_id)));
  end if;
  return new;
end;
$$;
create trigger redemptions_queue_message after update of status on public.redemptions
  for each row execute function public.queue_redemption_message();

-- Points the store gives on its own (welcome, birthday): an 'adjust' entry with a note, never an
-- 'earn', so visit counts and the counter's limits aren't affected.
create function public.grant_system_points(
  p_store_id uuid, p_customer_id uuid, p_points integer, p_note text, p_key text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.point_transactions
    (store_id, customer_id, type, points, source, idempotency_key, note)
  values (p_store_id, p_customer_id, 'adjust', p_points, 'system', p_key, p_note)
  on conflict (idempotency_key) do nothing;
  if not found then return false; end if;
  update public.store_customers set points_balance = points_balance + p_points
  where store_id = p_store_id and customer_id = p_customer_id;
  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'system', null, 'points.bonus', 'customer', p_customer_id,
          jsonb_build_object('points', p_points, 'note', p_note));
  return true;
end;
$$;

-- Called once after sign-up (and after claiming a number): welcome bonus, then the welcome message.
create function public.customer_joined(p_store_id uuid, p_customer_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_bonus integer;
begin
  select welcome_bonus_points into v_bonus from public.stores where id = p_store_id;
  if v_bonus is not null then
    perform public.grant_system_points(p_store_id, p_customer_id, v_bonus, 'Welcome bonus',
      'welcome:' || p_store_id || ':' || p_customer_id);
  end if;
  perform public.queue_event_message(p_store_id, p_customer_id, 'welcome',
    jsonb_build_object('bonus', coalesce(v_bonus, 0)));
end;
$$;

-- Every hour; each store's work runs in its 9 o'clock hour, local time: birthdays, "we miss you"
-- at 30, 60 and 90 days, and points expiry with a reminder 14 days before.
create function public.run_daily_messages(p_now timestamptz default now())
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_store public.stores;
  v_today date;
  v_row record;
begin
  for v_store in select * from public.stores where status = 'active' loop
    if extract(hour from p_now at time zone v_store.timezone) <> 9 then continue; end if;
    v_today := (p_now at time zone v_store.timezone)::date;

    for v_row in
      select m.customer_id from public.store_customers m
      join public.customers c on c.id = m.customer_id and c.status = 'active'
      where m.store_id = v_store.id and c.birthday is not null
        and (m.birthday_rewarded_year is null or m.birthday_rewarded_year < extract(year from v_today))
        and (extract(month from c.birthday), extract(day from c.birthday))
          = (extract(month from v_today), extract(day from v_today))
    loop
      if v_store.birthday_bonus_points is not null then
        perform public.grant_system_points(v_store.id, v_row.customer_id,
          v_store.birthday_bonus_points, 'Birthday bonus',
          'birthday:' || v_store.id || ':' || v_row.customer_id || ':' || extract(year from v_today));
      end if;
      update public.store_customers set birthday_rewarded_year = extract(year from v_today)
      where store_id = v_store.id and customer_id = v_row.customer_id;
      perform public.queue_event_message(v_store.id, v_row.customer_id, 'birthday',
        jsonb_build_object('bonus', coalesce(v_store.birthday_bonus_points, 0)));
    end loop;

    for v_row in
      select m.customer_id, v_today - (m.last_visit_at at time zone v_store.timezone)::date as days
      from public.store_customers m
      where m.store_id = v_store.id and m.last_visit_at is not null
        and v_today - (m.last_visit_at at time zone v_store.timezone)::date in (30, 60, 90)
    loop
      perform public.queue_event_message(v_store.id, v_row.customer_id, 'we_miss_you',
        jsonb_build_object('days', v_row.days));
    end loop;

    if v_store.points_expire_after_months is not null then
      for v_row in
        select m.customer_id, m.points_balance from public.store_customers m
        where m.store_id = v_store.id and m.points_balance > 0 and m.last_visit_at is not null
          and (m.last_visit_at at time zone v_store.timezone)::date
              + make_interval(months => v_store.points_expire_after_months) - interval '14 days'
              = v_today
      loop
        perform public.queue_event_message(v_store.id, v_row.customer_id, 'points_expiring',
          jsonb_build_object('points', v_row.points_balance, 'days', 14));
      end loop;

      for v_row in
        select m.id, m.customer_id, m.points_balance from public.store_customers m
        where m.store_id = v_store.id and m.points_balance > 0 and m.last_visit_at is not null
          and (m.last_visit_at at time zone v_store.timezone)::date
              + make_interval(months => v_store.points_expire_after_months) <= v_today
        for update
      loop
        insert into public.point_transactions
          (store_id, customer_id, type, points, source, idempotency_key, note)
        values (v_store.id, v_row.customer_id, 'expire', -v_row.points_balance, 'system',
                'expire:' || v_row.id || ':' || v_today, 'Points expired')
        on conflict (idempotency_key) do nothing;
        if found then
          update public.store_customers set points_balance = 0 where id = v_row.id;
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

select cron.schedule('daily-messages', '5 * * * *', 'select public.run_daily_messages()');

-- Who a special message would reach, per group and channel (the opt-ins decide).
create function public.broadcast_recipients(p_store_id uuid, p_audience text, p_channel text)
returns table (customer_id uuid)
language sql stable security definer set search_path = '' as $$
  with store as (select timezone from public.stores where id = p_store_id)
  select m.customer_id
  from public.store_customers m
  join public.customers c on c.id = m.customer_id and c.status = 'active'
  cross join store
  where m.store_id = p_store_id
    and case p_channel
          when 'sms' then m.sms_marketing_consent and c.phone_e164 is not null
          else m.marketing_email_consent and c.email is not null end
    and case p_audience
          when 'all' then true
          when 'lapsed_30' then m.last_visit_at < now() - interval '30 days'
          when 'reward_waiting' then exists (
            select 1 from public.rewards r
            where r.store_id = p_store_id and r.active and r.cost_points <= m.points_balance)
          when 'birthday_month' then extract(month from c.birthday)
            = extract(month from now() at time zone store.timezone)
          else false end;
$$;

create function public.broadcast_counts(p_store_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(a.audience || ':' || ch.channel,
    (select count(*) from public.broadcast_recipients(p_store_id, a.audience, ch.channel)))
  from (values ('all'), ('lapsed_30'), ('reward_waiting'), ('birthday_month')) as a (audience)
  cross join (values ('sms'), ('email')) as ch (channel);
$$;

create function public.create_broadcast(
  p_store_id uuid, p_channel text, p_audience text, p_subject text, p_body text, p_staff_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_count integer;
begin
  insert into public.broadcasts (store_id, channel, audience, subject, body, created_by)
  values (p_store_id, p_channel, p_audience, p_subject, p_body, p_staff_id)
  returning id into v_id;
  insert into public.messages (store_id, customer_id, broadcast_id, channel, event)
  select p_store_id, r.customer_id, v_id, p_channel, 'broadcast'
  from public.broadcast_recipients(p_store_id, p_audience, p_channel) r;
  get diagnostics v_count = row_count;
  update public.broadcasts set recipients = v_count where id = v_id;
  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'messages.broadcast', 'broadcast', v_id,
          jsonb_build_object('channel', p_channel, 'audience', p_audience, 'recipients', v_count));
  return jsonb_build_object('broadcast_id', v_id, 'recipients', v_count);
end;
$$;

-- The sender takes a batch atomically; rows stuck in 'sending' (a crashed worker) go back.
create function public.claim_messages(p_limit integer default 20)
returns setof public.messages
language plpgsql security definer set search_path = '' as $$
begin
  update public.messages set status = 'queued'
  where status = 'sending' and updated_at < now() - interval '10 minutes';
  return query
  update public.messages set status = 'sending', attempts = attempts + 1
  where id in (
    select id from public.messages
    where status = 'queued' and send_after <= now()
    order by send_after limit p_limit
    for update skip locked)
  returning *;
end;
$$;

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
  v_points integer;
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

  -- Double-points days (D84): the owner's multiplier on the store's calendar days.
  v_points := v_store.points_per_visit * case
    when v_store.double_points_multiplier is not null
     and (now() at time zone v_store.timezone)::date
         between v_store.double_points_from and v_store.double_points_to
    then v_store.double_points_multiplier else 1 end;

  begin
    insert into public.point_transactions
      (store_id, customer_id, type, points, source, staff_id, idempotency_key)
    values
      (p_store_id, v_customer.id, 'earn', v_points, 'staff_manual', p_staff_id,
       p_idempotency_key)
    returning id into v_transaction_id;
  exception when unique_violation then
    -- The same key won a race in another transaction: treat as the duplicate it is.
    return public.earn_points(p_store_id, p_phone_e164, p_staff_id, p_idempotency_key);
  end;

  update public.store_customers
  set points_balance = points_balance + v_points,
      visit_count = visit_count + 1,
      last_visit_at = now()
  where id = v_member.id
  returning * into v_member;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'points.earn', 'customer', v_customer.id,
          jsonb_build_object('points', v_points, 'new_customer', v_is_new,
                             'transaction_id', v_transaction_id));

  return jsonb_build_object(
    'duplicate', false, 'added', v_points, 'transaction_id', v_transaction_id,
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

revoke execute on function public.set_sms_consent, public.queue_event_message,
  public.grant_system_points, public.customer_joined, public.run_daily_messages,
  public.broadcast_recipients, public.broadcast_counts, public.create_broadcast,
  public.claim_messages from public, anon, authenticated;
grant execute on function public.set_sms_consent, public.queue_event_message,
  public.grant_system_points, public.customer_joined, public.run_daily_messages,
  public.broadcast_recipients, public.broadcast_counts, public.create_broadcast,
  public.claim_messages to service_role;
