-- Milestone 6: Void (spec §6, §7): a cashier undoes their own visit within 10 minutes.
-- Nothing is deleted: a 'reversal' row cancels the original in the append-only ledger.

-- An entry can be reversed only once.
create unique index point_transactions_one_reversal
  on public.point_transactions (reverses_transaction_id)
  where reverses_transaction_id is not null;

-- Raises (SQLSTATE P0001): 'not_found', 'not_own_entry', 'too_late', 'already_voided',
-- 'points_already_used' (the customer spent them on a reward since).
create function public.void_transaction(p_store_id uuid, p_transaction_id uuid, p_staff_id uuid)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_entry public.point_transactions;
  v_member public.store_customers;
  v_reversal_id uuid;
begin
  select * into v_entry from public.point_transactions
  where id = p_transaction_id and store_id = p_store_id and type = 'earn'
  for update;
  if v_entry.id is null then raise exception 'not_found'; end if;
  if v_entry.staff_id is distinct from p_staff_id then raise exception 'not_own_entry'; end if;
  if v_entry.created_at < now() - interval '10 minutes' then raise exception 'too_late'; end if;
  if exists (select 1 from public.point_transactions where reverses_transaction_id = v_entry.id) then
    raise exception 'already_voided';
  end if;

  select * into v_member from public.store_customers
  where store_id = p_store_id and customer_id = v_entry.customer_id
  for update;
  -- Balance never below zero: if a reward already used these points, the owner adjusts instead.
  if v_member.points_balance < v_entry.points then raise exception 'points_already_used'; end if;

  insert into public.point_transactions
    (store_id, customer_id, type, points, source, staff_id, reverses_transaction_id,
     idempotency_key, note)
  values
    (p_store_id, v_entry.customer_id, 'reversal', -v_entry.points, 'staff_manual', p_staff_id,
     v_entry.id, 'void:' || v_entry.id, 'Voided at the counter')
  returning id into v_reversal_id;

  update public.store_customers
  set points_balance = points_balance - v_entry.points,
      visit_count = greatest(visit_count - 1, 0)
  where id = v_member.id
  returning * into v_member;

  insert into public.audit_log (store_id, actor_type, actor_id, action, target_type, target_id, details)
  values (p_store_id, 'staff', p_staff_id, 'points.void', 'customer', v_entry.customer_id,
          jsonb_build_object('transaction_id', v_entry.id, 'reversal_id', v_reversal_id,
                             'points', -v_entry.points));

  return jsonb_build_object('customer_id', v_entry.customer_id, 'balance', v_member.points_balance,
                            'points', v_entry.points);
end;
$$;

revoke execute on function public.void_transaction from public, anon, authenticated;
grant execute on function public.void_transaction to service_role;
