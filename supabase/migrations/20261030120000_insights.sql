-- Phase 3 (DECISIONS D79): does the program work? Numbers for the owner's Overview beyond counts.
-- Counted in Postgres like dashboard_overview (D60). Voided visits never count.

create function public.dashboard_insights(p_store_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  with store as (
    select timezone, (now() at time zone timezone)::date as today
    from public.stores where id = p_store_id
  ),
  visits as (
    select t.customer_id, t.staff_id, (t.created_at at time zone store.timezone)::date as day
    from public.point_transactions t, store
    where t.store_id = p_store_id and t.type = 'earn'
      and t.created_at >= now() - interval '31 days'
      and not exists (select 1 from public.point_transactions r where r.reverses_transaction_id = t.id)
  ),
  members as (
    select sc.last_visit_at, sc.points_balance
    from public.store_customers sc join public.customers c on c.id = sc.customer_id
    where sc.store_id = p_store_id and c.status <> 'deleted'
  ),
  cheapest as (
    select min(cost_points) as cost from public.rewards where store_id = p_store_id and active
  )
  select jsonb_build_object(
    -- Visits per day for the last 30 days, oldest first, days without visits included.
    'daily', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'visits', coalesce(v.visits, 0)) order by d.day)
      from store,
           lateral (select generate_series(store.today - 29, store.today, interval '1 day')::date as day) d
      left join (select day, count(*) as visits from visits group by day) v on v.day = d.day
    ),
    -- Customers who came before but not lately: last visit 30–60, 60–90 and 90+ days ago.
    'lapsed_30', (select count(*) from members
                  where last_visit_at < now() - interval '30 days' and last_visit_at >= now() - interval '60 days'),
    'lapsed_60', (select count(*) from members
                  where last_visit_at < now() - interval '60 days' and last_visit_at >= now() - interval '90 days'),
    'lapsed_90', (select count(*) from members where last_visit_at < now() - interval '90 days'),
    -- Customers with enough points for a reward who haven't used it yet.
    'rewards_waiting', (select count(*) from members, cheapest where points_balance >= cheapest.cost),
    -- Visits per cashier, last 7 days, busiest first.
    'cashiers', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.display_name, 'visits', c.visits) order by c.visits desc)
      from (select staff_id, count(*) as visits from visits, store
            where day > store.today - 7 and staff_id is not null group by staff_id) c
      join public.staff s on s.id = c.staff_id
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.dashboard_insights from public, anon, authenticated;
grant execute on function public.dashboard_insights to service_role;
