-- Milestone 5: account changes the customer makes themselves (spec §4.4).

-- Offer-email consent changed from the Account page: membership flag + permanent consent record.
create function public.set_marketing_consent(
  p_store_id uuid, p_customer_id uuid, p_granted boolean, p_source text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.store_customers
  set marketing_email_consent = p_granted,
      marketing_email_consent_at = now(),
      marketing_email_consent_source = p_source
  where store_id = p_store_id and customer_id = p_customer_id;

  insert into public.consent_events (customer_id, store_id, kind, document_version, granted, source)
  values (p_customer_id, p_store_id, 'marketing_email', null, p_granted, p_source);
end;
$$;

-- Delete my account: personal data is erased in one transaction; the points ledger, redemptions
-- and consent records stay, pointing at an anonymous customer row (status 'deleted'). The phone
-- number and email become free for a new sign-up. The Auth login is removed by the caller.
create function public.anonymize_customer(p_customer_id uuid)
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

revoke execute on function public.set_marketing_consent from public, anon, authenticated;
revoke execute on function public.anonymize_customer from public, anon, authenticated;
grant execute on function public.set_marketing_consent to service_role;
grant execute on function public.anonymize_customer to service_role;
