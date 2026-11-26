-- Maplerad only makes cards for "tier 2" customers: an ID document (NIN, passport, driver's licence
-- or voter's card) plus a selfie on top of the BVN check. Nothing is deleted.

alter table flowvault.profiles add column if not exists provider_tier int;
update flowvault.profiles set provider_tier = 1 where provider_customer_id is not null and provider_tier is null;

-- Private storage for ID photos sent to Maplerad (only the server can read or write it).
insert into storage.buckets (id, name, public) values ('flowvault-kyc', 'flowvault-kyc', false) on conflict (id) do nothing;

create or replace function public.fv_server_customer2(p_user uuid)
returns table(customer_id text, tier int, full_name text, email text) language sql stable security definer set search_path = flowvault, pg_temp as $$
  select p.provider_customer_id, p.provider_tier, p.full_name, u.email::text from profiles p join auth.users u on u.id = p.id where p.id = p_user;
$$;
create or replace function public.fv_server_set_tier(p_user uuid, p_tier int)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update profiles set provider_tier = p_tier where id = p_user;
$$;
revoke all on function public.fv_server_customer2(uuid), public.fv_server_set_tier(uuid,int) from public, anon, authenticated;
grant execute on function public.fv_server_customer2(uuid), public.fv_server_set_tier(uuid,int) to service_role;

-- Real cards only once the customer is tier 2.
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
  v_real := (select card_provider from settings) <> 'mock' or (p.provider_customer_id is not null and coalesce(p.provider_tier, 0) >= 2);
  if not v_real then
    perform issue_mock_card(s, coalesce(p.full_name, 'Flowvault user'));
  else
    insert into cards(user_id, subscription_id, provider, holder_name, currency, status)
    values (auth.uid(), s.id, 'maplerad', upper(coalesce(p.full_name, 'Flowvault user')), 'USD', 'pending');
  end if;
  return s.id;
end $$;
revoke all on function public.fv_add_subscription(text,text,text,bigint,int,text) from public, anon;
grant execute on function public.fv_add_subscription(text,text,text,bigint,int,text) to authenticated;

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
    'card_provider', (select card_provider from settings)
  );
$$;
revoke all on function public.fv_state() from public, anon;
grant execute on function public.fv_state() to authenticated;
