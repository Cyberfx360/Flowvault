-- Card fee follows Maplerad's real prices (Maplerad commercials, Nov 2026), set in dollars and turned
-- into Naira at the app's USD rate (flowvault.fx_rates), rounded up to the next ₦100.
--   Card issuance $2.00 + card funding fee $1.00 + $2.00 first load on the card = $5.00 from the Spend wallet,
--   + 3% Treasury -> Spend transfer fee on that $5.00 = $0.15. Total $5.15 (515 cents), no Flowvault margin.
-- Change it with:  update flowvault.settings set card_fee_usd_cents = 515;
-- Set card_fee_usd_cents to null to use the fixed Naira fee (card_fee_kobo) instead. Nothing is deleted.

alter table flowvault.settings add column if not exists card_fee_usd_cents int check (card_fee_usd_cents >= 0);
update flowvault.settings set card_fee_usd_cents = 515 where card_fee_usd_cents is null;

create or replace function flowvault.current_card_fee_kobo()
returns bigint language sql stable security definer set search_path = flowvault, pg_temp as $$
  select case when s.card_fee_usd_cents is null then s.card_fee_kobo
              else (ceil(s.card_fee_usd_cents * coalesce(r.ngn_per_unit, 1550) / 10000.0) * 10000)::bigint end
  from settings s left join fx_rates r on r.currency = 'USD';
$$;
revoke all on function flowvault.current_card_fee_kobo() from public, anon, authenticated;

create or replace function flowvault.take_card_fee(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards; v_fee bigint; v_bal bigint; v_name text;
begin
  select * into c from cards where subscription_id = p_subscription for update;
  if c.id is null then raise exception 'No card for this subscription'; end if;
  if c.provider = 'mock' or c.fee_paid_kobo > 0 then return 'ok'; end if;
  v_fee := current_card_fee_kobo();
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
revoke all on function flowvault.take_card_fee(uuid) from public, anon, authenticated;
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
    'card_fee', current_card_fee_kobo()
  );
$$;
revoke all on function public.fv_state() from public, anon;
grant execute on function public.fv_state() to authenticated;
