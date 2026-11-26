-- Keep the card company's reason when a card couldn't be made, so the app can show it. Nothing is deleted.
alter table flowvault.cards add column if not exists last_error text;

create or replace function public.fv_server_card_request_failed(p_subscription uuid, p_error text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set status = 'failed', last_error = left(p_error, 300) where subscription_id = p_subscription and status = 'pending';
$$;
revoke all on function public.fv_server_card_request_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.fv_server_card_request_failed(uuid, text) to service_role;

create or replace function public.fv_server_card_failed_reason(p_reference text, p_error text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set status = 'failed', last_error = left(p_error, 300) where provider_ref = p_reference;
$$;
revoke all on function public.fv_server_card_failed_reason(text, text) from public, anon, authenticated;
grant execute on function public.fv_server_card_failed_reason(text, text) to service_role;

-- Asking again clears the old reason.
create or replace function flowvault.card_requested(p_subscription uuid, p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set provider_ref = p_reference, status = 'pending', last_error = null where subscription_id = p_subscription;
$$;
revoke all on function flowvault.card_requested(uuid, text) from public, anon, authenticated;

create or replace function public.fv_state()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone, 'verified', provider_customer_id is not null) from profiles where id = auth.uid()),
    'balance', (select balance_kobo from wallets where user_id = auth.uid()),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('subscription_id', subscription_id, 'holder_name', holder_name,
              'last4', last4, 'exp_month', exp_month, 'exp_year', exp_year, 'network', network, 'currency', currency,
              'frozen', frozen, 'status', status, 'provider', provider, 'last_error', last_error))
              from cards where user_id = auth.uid() and subscription_id is not null), '[]'::jsonb),
    'subs', coalesce((select jsonb_agg(to_jsonb(s) - 'user_id' order by s.billing_day, s.created_at) from subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'txns', coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at desc)
              from (select * from transactions where user_id = auth.uid() order by created_at desc limit 200) t), '[]'::jsonb),
    'usd_rate', (select ngn_per_unit from fx_rates where currency = 'USD'),
    'card_provider', (select card_provider from settings)
  );
$$;
revoke all on function public.fv_state() from public, anon;
grant execute on function public.fv_state() to authenticated;
