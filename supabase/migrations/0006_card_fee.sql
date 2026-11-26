-- Card fee: making a real card costs the user a fee taken from their Flowvault wallet.
-- If the wallet can't cover it, the card isn't requested and the user sees "Insufficient balance".
-- If the card company fails to make the card, the fee goes back to the wallet.
-- Pretend (test) cards are free. Change the fee with:
--   update flowvault.settings set card_fee_kobo = 500000;   -- ₦5,000 (amounts are in kobo)
-- Nothing is deleted.

alter table flowvault.settings add column if not exists card_fee_kobo bigint not null default 500000 check (card_fee_kobo >= 0);
alter table flowvault.cards add column if not exists fee_paid_kobo bigint not null default 0 check (fee_paid_kobo >= 0);

-- Returns 'ok' (fee taken now or already paid) or 'insufficient'.
create or replace function flowvault.take_card_fee(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards; v_fee bigint; v_bal bigint; v_name text;
begin
  select * into c from cards where subscription_id = p_subscription for update;
  if c.id is null then raise exception 'No card for this subscription'; end if;
  if c.provider = 'mock' or c.fee_paid_kobo > 0 then return 'ok'; end if;
  select card_fee_kobo into v_fee from settings;
  if coalesce(v_fee, 0) = 0 then return 'ok'; end if;
  select balance_kobo into v_bal from wallets where user_id = c.user_id for update;
  if coalesce(v_bal, 0) < v_fee then
    update cards set status = 'failed', last_error = 'Insufficient balance' where id = c.id;
    return 'insufficient';
  end if;
  select name into v_name from subscriptions where id = p_subscription;
  update wallets set balance_kobo = balance_kobo - v_fee, updated_at = now() where user_id = c.user_id;
  update cards set fee_paid_kobo = v_fee where id = c.id;
  insert into transactions(user_id, kind, status, amount_kobo, title, detail, subscription_id)
    values (c.user_id, 'charge', 'success', v_fee, 'Card fee', 'New card for ' || coalesce(v_name, 'a subscription'), p_subscription);
  return 'ok';
end $$;

-- Gives the fee back if one was taken for this card.
create or replace function flowvault.refund_card_fee(p_card uuid)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards; v_name text;
begin
  select * into c from cards where id = p_card for update;
  if c.id is null or c.fee_paid_kobo = 0 then return; end if;
  select name into v_name from subscriptions where id = c.subscription_id;
  update wallets set balance_kobo = balance_kobo + c.fee_paid_kobo, updated_at = now() where user_id = c.user_id;
  insert into transactions(user_id, kind, status, amount_kobo, title, detail, subscription_id)
    values (c.user_id, 'topup', 'success', c.fee_paid_kobo, 'Card fee refund', 'Card for ' || coalesce(v_name, 'a subscription') || ' wasn''t made', c.subscription_id);
  update cards set fee_paid_kobo = 0 where id = c.id;
end $$;
revoke all on function flowvault.take_card_fee(uuid) from public, anon, authenticated;
revoke all on function flowvault.refund_card_fee(uuid) from public, anon, authenticated;

create or replace function public.fv_server_take_card_fee(p_subscription uuid)
returns text language sql security definer set search_path = flowvault, pg_temp as $$ select take_card_fee(p_subscription); $$;
revoke all on function public.fv_server_take_card_fee(uuid) from public, anon, authenticated;
grant execute on function public.fv_server_take_card_fee(uuid) to service_role;

-- Failures now refund the fee.
create or replace function public.fv_server_card_request_failed(p_subscription uuid, p_error text)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_id uuid;
begin
  update cards set status = 'failed', last_error = left(p_error, 300) where subscription_id = p_subscription and status in ('pending','failed') returning id into v_id;
  if v_id is not null then perform refund_card_fee(v_id); end if;
end $$;
revoke all on function public.fv_server_card_request_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.fv_server_card_request_failed(uuid, text) to service_role;

create or replace function public.fv_server_card_failed_reason(p_reference text, p_error text)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_id uuid;
begin
  update cards set status = 'failed', last_error = left(p_error, 300) where provider_ref = p_reference and status <> 'active' returning id into v_id;
  if v_id is not null then perform refund_card_fee(v_id); end if;
end $$;
revoke all on function public.fv_server_card_failed_reason(text, text) from public, anon, authenticated;
grant execute on function public.fv_server_card_failed_reason(text, text) to service_role;

create or replace function public.fv_state()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone,
                 'verified', provider_customer_id is not null and coalesce(provider_tier, 0) >= 2,
                 'tier', case when provider_customer_id is null then 0 else coalesce(provider_tier, 1) end)
               from profiles where id = auth.uid()),
    'balance', (select balance_kobo from wallets where user_id = auth.uid()),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('subscription_id', subscription_id, 'holder_name', holder_name,
              'last4', last4, 'exp_month', exp_month, 'exp_year', exp_year, 'network', network, 'currency', currency,
              'frozen', frozen, 'status', status, 'provider', provider, 'last_error', last_error))
              from cards where user_id = auth.uid() and subscription_id is not null), '[]'::jsonb),
    'subs', coalesce((select jsonb_agg(to_jsonb(s) - 'user_id' order by s.billing_day, s.created_at) from subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'txns', coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at desc)
              from (select * from transactions where user_id = auth.uid() order by created_at desc limit 200) t), '[]'::jsonb),
    'usd_rate', (select ngn_per_unit from fx_rates where currency = 'USD'),
    'card_provider', (select card_provider from settings),
    'card_fee', (select card_fee_kobo from settings)
  );
$$;
revoke all on function public.fv_state() from public, anon;
grant execute on function public.fv_state() to authenticated;
