-- One virtual card per subscription.
--
-- Every subscription now gets its own card number, which the user enters at that one company.
-- Switching a subscription off freezes its card, so the company's next charge is declined by the
-- card network itself. Nothing needs to match merchant names.
--
-- Card issuing goes through a provider (Maplerad first). Until real API keys exist the provider is
-- "mock": the database makes pretend cards itself. When flowvault.settings.card_provider is changed
-- to 'maplerad', new cards are created as 'pending' and the server (app/api/...) issues them at
-- Maplerad and fills them in with flowvault.attach_card(), using the service role key.
--
-- As before, nothing outside the flowvault schema is touched except fv_* functions.

create table if not exists flowvault.settings (
  id boolean primary key default true check (id),
  card_provider text not null default 'mock' check (card_provider in ('mock','maplerad'))
);
insert into flowvault.settings(id) values (true) on conflict do nothing;
alter table flowvault.settings enable row level security;
revoke all on flowvault.settings from public, anon, authenticated;

-- Old account-wide cards were all pretend ones. They are kept but retired (no subscription, status
-- 'terminated'), and the app only shows cards that belong to a subscription.
alter table flowvault.cards drop constraint if exists cards_user_id_key;
alter table flowvault.cards
  add column subscription_id uuid unique references flowvault.subscriptions(id) on delete cascade,
  add column currency text not null default 'USD' check (currency in ('NGN','USD')),
  add column status text not null default 'active' check (status in ('pending','active','failed','terminated')),
  alter column last4 drop not null,
  alter column exp_month drop not null,
  alter column exp_year drop not null;
create index if not exists cards_user_idx on flowvault.cards(user_id);
update flowvault.cards set status = 'terminated' where subscription_id is null;

-- Makes a pretend card (mock provider only).
create or replace function flowvault.issue_mock_card(p_sub flowvault.subscriptions, p_holder text)
returns uuid language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_pan text; v_id uuid;
begin
  v_pan := '4187' || lpad((floor(random()*1e12))::bigint::text, 12, '0');  -- MOCK card number
  insert into cards(user_id, subscription_id, provider, holder_name, last4, mock_pan, mock_cvv, exp_month, exp_year,
                    currency, frozen, status)
  values (p_sub.user_id, p_sub.id, 'mock', upper(p_holder), right(v_pan,4), v_pan,
          lpad((floor(random()*1000))::int::text, 3, '0'),
          extract(month from now())::int, extract(year from now())::int + 3,
          p_sub.currency, not p_sub.is_on, 'active')
  returning id into v_id;
  return v_id;
end $$;

-- Give every existing subscription a pretend card.
do $$
declare s flowvault.subscriptions; v_name text;
begin
  for s in select * from flowvault.subscriptions loop
    select full_name into v_name from flowvault.profiles where id = s.user_id;
    perform flowvault.issue_mock_card(s, coalesce(v_name, 'Flowvault user'));
  end loop;
end $$;

-- Maplerad needs a customer record per user before it will issue cards.
alter table flowvault.profiles add column if not exists provider_customer_id text;

-- SERVER ONLY (service role): the provider accepted a card request. Maplerad creates cards in the
-- background, so we keep its tracking reference until the "card created" webhook arrives.
create or replace function flowvault.card_requested(p_subscription uuid, p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set provider_ref = p_reference, status = 'pending' where subscription_id = p_subscription;
$$;

-- SERVER ONLY: the provider's "card created" webhook. Finds the card by its tracking reference.
create or replace function flowvault.attach_card(p_reference text, p_card_id text, p_last4 text,
  p_network text default 'Visa', p_exp_month int default null, p_exp_year int default null)
returns uuid language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards;
begin
  update cards set provider_ref = p_card_id, last4 = p_last4, network = p_network,
    exp_month = coalesce(p_exp_month, exp_month), exp_year = coalesce(p_exp_year, exp_year), status = 'active'
  where provider_ref = p_reference returning * into c;
  if c.id is null then raise exception 'Card not found'; end if;
  return c.id;
end $$;

create or replace function flowvault.mark_card_failed(p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set status = 'failed' where provider_ref = p_reference;
$$;

create or replace function flowvault.card_by_ref(p_ref text)
returns uuid language sql stable security definer set search_path = flowvault, pg_temp as $$
  select id from cards where provider_ref = p_ref;
$$;

-- A charge arrived on one card. Returns 'approved' or the decline reason.
-- Real provider: its transaction webhook calls this (service role) with the card's provider_ref.
-- Replaced by authorize_card_charge; the old one now refuses to run.
create or replace function flowvault.authorize_charge(p_user uuid, p_subscription uuid, p_amount_minor bigint, p_currency text)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin raise exception 'Replaced by authorize_card_charge'; end $$;
create or replace function flowvault.authorize_card_charge(p_card uuid, p_amount_minor bigint, p_currency text)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare
  c cards; s subscriptions; v_kobo bigint; v_rate numeric; v_reason text; v_bal bigint;
begin
  select * into c from cards where id = p_card;
  if c.id is null then raise exception 'Card not found'; end if;
  select * into s from subscriptions where id = c.subscription_id;
  if p_currency = 'USD' then
    select ngn_per_unit into v_rate from fx_rates where currency = 'USD';
    v_kobo := ceil(p_amount_minor * v_rate);  -- cents * NGN per USD = kobo
  else
    v_kobo := p_amount_minor;
  end if;

  select balance_kobo into v_bal from wallets where user_id = c.user_id for update;

  if c.status <> 'active' then v_reason := 'Card is not ready';
  elsif c.frozen or not s.is_on then v_reason := 'Subscription is off';
  elsif s.price_guard and p_currency = s.currency and p_amount_minor > s.price_minor * 1.1 then v_reason := 'Price went up';
  elsif coalesce(v_bal, 0) < v_kobo then v_reason := 'Not enough money in wallet';
  end if;

  if v_reason is null then
    update wallets set balance_kobo = balance_kobo - v_kobo, updated_at = now() where user_id = c.user_id;
  end if;

  insert into transactions(user_id, kind, status, amount_kobo, title, detail, subscription_id, decline_reason)
  values (c.user_id, 'charge', case when v_reason is null then 'success' else 'declined' end,
          case when v_reason is null then v_kobo else 0 end,
          s.name,
          case when v_reason is null then 'Card ••' || c.last4 else 'Declined: ' || lower(v_reason) end,
          s.id, v_reason);
  return coalesce(v_reason, 'approved');
end $$;

revoke all on all functions in schema flowvault from public, anon, authenticated;

-- ---------- entry points ----------

-- No more account-wide card: just the profile and wallet.
create or replace function public.fv_ensure_account()
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_uid uuid := auth.uid(); u record; v_name text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from profiles where id = v_uid) then return; end if;
  select email, raw_user_meta_data into u from auth.users where id = v_uid;
  v_name := coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1));
  insert into profiles(id, full_name, phone) values (v_uid, v_name, u.raw_user_meta_data->>'phone') on conflict do nothing;
  insert into wallets(user_id) values (v_uid) on conflict do nothing;
end $$;

create or replace function public.fv_state()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone) from profiles where id = auth.uid()),
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

-- MOCK: pretend the company just charged this subscription's card.
create or replace function public.fv_mock_charge(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare s subscriptions; v_card uuid;
begin
  select * into s from subscriptions where id = p_subscription and user_id = auth.uid();
  if s.id is null then raise exception 'Subscription not found'; end if;
  if (select card_provider from settings) <> 'mock' then raise exception 'Test charges only work in test mode'; end if;
  select id into v_card from cards where subscription_id = s.id;
  return authorize_card_charge(v_card, s.price_minor, s.currency);
end $$;

-- Adds a subscription and its card (a pretend one in mock mode, a pending one otherwise).
create or replace function public.fv_add_subscription(p_name text, p_plan text, p_currency text, p_price_minor bigint, p_billing_day int, p_color text)
returns uuid language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare s subscriptions; v_holder text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if (select count(*) from subscriptions where user_id = auth.uid()) >= 30 then
    raise exception 'You can have up to 30 subscriptions';
  end if;
  insert into subscriptions(user_id, name, plan, currency, price_minor, billing_day, color)
  values (auth.uid(), trim(p_name), coalesce(nullif(trim(p_plan),''),'Monthly'), p_currency, p_price_minor, p_billing_day,
          case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#565a55' end)
  returning * into s;
  select full_name into v_holder from profiles where id = auth.uid();
  if (select card_provider from settings) = 'mock' then
    perform issue_mock_card(s, coalesce(v_holder, 'Flowvault user'));
  else
    insert into cards(user_id, subscription_id, provider, holder_name, currency, status)
    values (auth.uid(), s.id, (select card_provider from settings), upper(coalesce(v_holder, 'Flowvault user')), s.currency, 'pending');
  end if;
  return s.id;
end $$;

-- Switching a subscription off freezes its card; switching on unfreezes it.
-- With a real provider the server freezes the card at the provider first, then calls this.
create or replace function public.fv_update_subscription(p_id uuid, p_is_on boolean default null, p_price_guard boolean default null, p_remind boolean default null)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin
  update subscriptions set
    is_on = coalesce(p_is_on, is_on), price_guard = coalesce(p_price_guard, price_guard), remind = coalesce(p_remind, remind)
  where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Subscription not found'; end if;
  if p_is_on is not null then
    update cards set frozen = not p_is_on where subscription_id = p_id;
  end if;
end $$;

-- The provider's id for a subscription's card (the server needs it to freeze, reveal or end the card).
create or replace function public.fv_card_ref(p_subscription uuid)
returns table(provider text, provider_ref text, status text) language sql stable security definer set search_path = flowvault, pg_temp as $$
  select provider, provider_ref, status from cards where subscription_id = p_subscription and user_id = auth.uid();
$$;

-- The old one-card functions are switched off (nobody can call them any more).
revoke all on function public.fv_update_card(boolean) from public, anon, authenticated;
revoke all on function public.fv_reveal_card() from public, anon, authenticated;
create or replace function public.fv_reveal_card(p_subscription uuid)
returns table(pan text, cvv text) language sql security definer set search_path = flowvault, pg_temp as $$
  select mock_pan, mock_cvv from cards where subscription_id = p_subscription and user_id = auth.uid() and provider = 'mock';
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.fv_ensure_account()', 'public.fv_state()', 'public.fv_mock_charge(uuid)',
    'public.fv_add_subscription(text,text,text,bigint,int,text)', 'public.fv_update_subscription(uuid,boolean,boolean,boolean)',
    'public.fv_card_ref(uuid)', 'public.fv_reveal_card(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------- server-only entry points (service role key; the browser can never call these) ----------
-- The flowvault schema isn't exposed over the API, so the server reaches it through these wrappers.

create or replace function public.fv_server_card_requested(p_subscription uuid, p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$ select card_requested(p_subscription, p_reference); $$;

create or replace function public.fv_server_attach_card(p_reference text, p_card_id text, p_last4 text, p_network text)
returns uuid language sql security definer set search_path = flowvault, pg_temp as $$ select attach_card(p_reference, p_card_id, p_last4, p_network); $$;

create or replace function public.fv_server_card_failed(p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$ select mark_card_failed(p_reference); $$;

create or replace function public.fv_server_card_charge(p_card_ref text, p_amount_minor bigint, p_currency text)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_card uuid := card_by_ref(p_card_ref);
begin
  if v_card is null then raise exception 'Card not found'; end if;
  return authorize_card_charge(v_card, p_amount_minor, p_currency);
end $$;

create or replace function public.fv_server_customer(p_user uuid)
returns table(customer_id text, full_name text, email text) language sql stable security definer set search_path = flowvault, pg_temp as $$
  select p.provider_customer_id, p.full_name, u.email::text from profiles p join auth.users u on u.id = p.id where p.id = p_user;
$$;

create or replace function public.fv_server_set_customer(p_user uuid, p_customer_id text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update profiles set provider_customer_id = p_customer_id where id = p_user;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.fv_server_card_requested(uuid,text)', 'public.fv_server_attach_card(text,text,text,text)',
    'public.fv_server_card_failed(text)', 'public.fv_server_card_charge(text,bigint,text)',
    'public.fv_server_customer(uuid)', 'public.fv_server_set_customer(uuid,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
