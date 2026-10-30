-- Optional birthday (DECISIONS D80), for birthday rewards. Asked at sign-up and on Account,
-- never required. Only month and day matter for the reward; the year is kept because the
-- phone's date picker asks for it. Erased with the rest of the personal details on deletion.

alter table public.customers
  add column birthday date check (birthday >= date '1900-01-01');

create or replace function public.anonymize_customer(p_customer_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.customers
  set status = 'deleted',
      auth_user_id = null,
      phone_e164 = null,
      email = null,
      first_name = null,
      last_name = null,
      email_verified_at = null,
      birthday = null,
      deleted_at = now()
  where id = p_customer_id;

  update public.store_customers
  set marketing_email_consent = false,
      marketing_email_consent_at = now(),
      marketing_email_consent_source = 'account_deleted'
  where customer_id = p_customer_id;

  update public.redemptions set status = 'cancelled'
  where customer_id = p_customer_id and status = 'pending';

  delete from public.email_verifications where customer_id = p_customer_id;

  insert into public.audit_log (actor_type, actor_id, action, target_type, target_id)
  values ('customer', p_customer_id, 'customer.deleted', 'customer', p_customer_id);
end;
$$;
