-- Milestone 9: retention (DECISIONS D5). An account a cashier created by typing a number, that
-- was never claimed by signing up and has had no activity for 12 months, is erased the same way
-- as "Delete my account" (anonymize_customer: personal details cleared, history kept).

create function public.purge_idle_unclaimed_customers(p_idle interval default interval '12 months')
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id uuid;
  v_count integer := 0;
begin
  for v_customer_id in
    select c.id from public.customers c
    where c.status = 'unclaimed'
      and c.created_at < now() - p_idle
      and not exists (select 1 from public.point_transactions t
                      where t.customer_id = c.id and t.created_at >= now() - p_idle)
    for update skip locked
  loop
    perform public.anonymize_customer(v_customer_id);
    insert into public.audit_log (actor_type, action, target_type, target_id, details)
    values ('system', 'customer.expired', 'customer', v_customer_id,
            jsonb_build_object('idle', p_idle::text));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.purge_idle_unclaimed_customers from public, anon, authenticated;
grant execute on function public.purge_idle_unclaimed_customers to service_role;

-- Every night at 04:30 UTC, inside the database (pg_cron, available locally and on Supabase).
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-idle-unclaimed-customers', '30 4 * * *',
                     'select public.purge_idle_unclaimed_customers()');
