-- Real (Maplerad) cards for users who have passed the ID check, even while the global switch
-- (flowvault.settings.card_provider) is still 'mock'. Everyone else keeps getting pretend cards.
-- Nothing is deleted.

create or replace function public.fv_add_subscription(p_name text, p_plan text, p_currency text, p_price_minor bigint, p_billing_day int, p_color text)
returns uuid language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare s subscriptions; p profiles; v_real boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select count(*) from subscriptions where user_id = auth.uid()) >= 30 then
    raise exception 'You can have up to 30 subscriptions';
  end if;
  insert into subscriptions(user_id, name, plan, currency, price_minor, billing_day, color)
  values (auth.uid(), trim(p_name), coalesce(nullif(trim(p_plan),''),'Monthly'), p_currency, p_price_minor, p_billing_day,
          case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#565a55' end)
  returning * into s;
  select * into p from profiles where id = auth.uid();
  v_real := (select card_provider from settings) <> 'mock' or p.provider_customer_id is not null;
  if not v_real then
    perform issue_mock_card(s, coalesce(p.full_name, 'Flowvault user'));
  else
    -- Maplerad cards are dollar cards; the server asks Maplerad for it right after this.
    insert into cards(user_id, subscription_id, provider, holder_name, currency, status)
    values (auth.uid(), s.id, 'maplerad', upper(coalesce(p.full_name, 'Flowvault user')), 'USD', 'pending');
  end if;
  return s.id;
end $$;

create or replace function public.fv_state()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone, 'verified', provider_customer_id is not null) from profiles where id = auth.uid()),
    'balance', (select balance_kobo from wallets where user_id = auth.uid()),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('subscription_id', subscription_id, 'holder_name', holder_name,
              'last4', last4, 'exp_month', exp_month, 'exp_year', exp_year, 'network', network, 'currency', currency,
              'frozen', frozen, 'status', status, 'provider', provider))
              from cards where user_id = auth.uid() and subscription_id is not null), '[]'::jsonb),
    'subs', coalesce((select jsonb_agg(to_jsonb(s) - 'user_id' order by s.billing_day, s.created_at) from subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'txns', coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at desc)
              from (select * from transactions where user_id = auth.uid() order by created_at desc limit 200) t), '[]'::jsonb),
    'usd_rate', (select ngn_per_unit from fx_rates where currency = 'USD'),
    'card_provider', (select card_provider from settings)
  );
$$;

-- Test charges only work on pretend cards.
create or replace function public.fv_mock_charge(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare s subscriptions; c cards;
begin
  select * into s from subscriptions where id = p_subscription and user_id = auth.uid();
  if s.id is null then raise exception 'Subscription not found'; end if;
  select * into c from cards where subscription_id = s.id;
  if c.provider <> 'mock' then raise exception 'Test charges only work on test cards'; end if;
  return authorize_card_charge(c.id, s.price_minor, s.currency);
end $$;

revoke all on function public.fv_add_subscription(text,text,text,bigint,int,text), public.fv_state(), public.fv_mock_charge(uuid) from public, anon;
grant execute on function public.fv_add_subscription(text,text,text,bigint,int,text), public.fv_state(), public.fv_mock_charge(uuid) to authenticated;

-- SERVER ONLY: asking the card company failed, so let the user retry.
create or replace function public.fv_server_card_request_failed(p_subscription uuid)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set status = 'failed' where subscription_id = p_subscription and status = 'pending';
$$;
revoke all on function public.fv_server_card_request_failed(uuid) from public, anon, authenticated;
grant execute on function public.fv_server_card_request_failed(uuid) to service_role;
