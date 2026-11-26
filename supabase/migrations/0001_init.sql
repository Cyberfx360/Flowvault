-- Flowvault schema.
--
-- Flowvault shares a Supabase project with another app (azaplug), so EVERYTHING here lives in
-- its own "flowvault" schema. Nothing in the public schema is created or changed, except a set of
-- entry-point functions whose names all start with fv_ (the browser can only call those).
-- No trigger is added to auth.users: Flowvault creates a user's wallet and card on first sign-in.
--
-- Money is stored in kobo (₦1 = 100 kobo) as bigint, so there are no rounding errors.
--
-- MOCK MODE: card issuing, top-ups and merchant charges are simulated (fv_mock_* functions).
-- When a real provider is added, its webhooks call flowvault.credit_wallet() and
-- flowvault.authorize_charge() from a server with the service role key.

create schema if not exists flowvault;
revoke all on schema flowvault from public, anon, authenticated;

-- ---------- tables ----------

create table flowvault.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create table flowvault.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_kobo bigint not null default 0 check (balance_kobo >= 0),
  updated_at timestamptz not null default now()
);

create table flowvault.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  provider text not null default 'mock',
  provider_ref text,
  holder_name text not null,
  last4 text not null,
  -- MOCK ONLY: a real issuer keeps the full number and CVV; we would fetch them on demand.
  mock_pan text,
  mock_cvv text,
  exp_month int not null,
  exp_year int not null,
  network text not null default 'Visa',
  frozen boolean not null default false,
  created_at timestamptz not null default now()
);

create table flowvault.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  plan text not null default 'Monthly',
  currency text not null default 'NGN' check (currency in ('NGN','USD')),
  price_minor bigint not null check (price_minor > 0), -- kobo for NGN, cents for USD
  billing_day int not null check (billing_day between 1 and 28),
  color text not null default '#565a55',
  is_on boolean not null default true,
  price_guard boolean not null default true,
  remind boolean not null default true,
  created_at timestamptz not null default now()
);
create index on flowvault.subscriptions(user_id);

create table flowvault.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('topup','charge')),
  status text not null check (status in ('success','declined')),
  amount_kobo bigint not null check (amount_kobo >= 0),
  title text not null,
  detail text not null default '',
  subscription_id uuid references flowvault.subscriptions(id) on delete set null,
  decline_reason text,
  created_at timestamptz not null default now()
);
create index on flowvault.transactions(user_id, created_at desc);

-- Rate used to convert dollar subscriptions from the Naira balance.
create table flowvault.fx_rates (
  currency text primary key,
  ngn_per_unit numeric not null,
  updated_at timestamptz not null default now()
);
insert into flowvault.fx_rates values ('USD', 1550, now());

-- Belt and braces: RLS on, no policies. Only the functions below can touch these tables.
alter table flowvault.profiles enable row level security;
alter table flowvault.wallets enable row level security;
alter table flowvault.cards enable row level security;
alter table flowvault.subscriptions enable row level security;
alter table flowvault.transactions enable row level security;
alter table flowvault.fx_rates enable row level security;
revoke all on all tables in schema flowvault from public, anon, authenticated;

-- ---------- internal (server-only) functions ----------

create or replace function flowvault.credit_wallet(p_user uuid, p_amount_kobo bigint, p_title text, p_detail text)
returns bigint language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_bal bigint;
begin
  if p_amount_kobo <= 0 then raise exception 'Amount must be positive'; end if;
  update wallets set balance_kobo = balance_kobo + p_amount_kobo, updated_at = now()
    where user_id = p_user returning balance_kobo into v_bal;
  if not found then raise exception 'Wallet not found'; end if;
  insert into transactions(user_id, kind, status, amount_kobo, title, detail)
    values (p_user, 'topup', 'success', p_amount_kobo, p_title, p_detail);
  return v_bal;
end $$;

-- Decides whether a card charge is approved. Returns 'approved' or the decline reason.
create or replace function flowvault.authorize_charge(p_user uuid, p_subscription uuid, p_amount_minor bigint, p_currency text)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare
  c cards; s subscriptions; v_kobo bigint; v_rate numeric; v_reason text; v_bal bigint;
begin
  select * into c from cards where user_id = p_user;
  select * into s from subscriptions where id = p_subscription and user_id = p_user;
  if p_currency = 'USD' then
    select ngn_per_unit into v_rate from fx_rates where currency = 'USD';
    v_kobo := ceil(p_amount_minor * v_rate);  -- cents * NGN per USD = kobo
  else
    v_kobo := p_amount_minor;
  end if;

  select balance_kobo into v_bal from wallets where user_id = p_user for update;

  if c.id is null then v_reason := 'No card';
  elsif c.frozen then v_reason := 'Card is frozen';
  elsif s.id is null then v_reason := 'Unknown merchant';
  elsif not s.is_on then v_reason := 'Subscription is off';
  elsif s.price_guard and p_currency = s.currency and p_amount_minor > s.price_minor * 1.1 then v_reason := 'Price went up';
  elsif coalesce(v_bal, 0) < v_kobo then v_reason := 'Not enough money in wallet';
  end if;

  if v_reason is null then
    update wallets set balance_kobo = balance_kobo - v_kobo, updated_at = now() where user_id = p_user;
  end if;

  insert into transactions(user_id, kind, status, amount_kobo, title, detail, subscription_id, decline_reason)
  values (p_user, 'charge', case when v_reason is null then 'success' else 'declined' end,
          case when v_reason is null then v_kobo else 0 end,
          coalesce(s.name, 'Unknown merchant'),
          case when v_reason is null then 'Card ••' || c.last4 else 'Declined: ' || lower(v_reason) end,
          s.id, v_reason);
  return coalesce(v_reason, 'approved');
end $$;

revoke all on all functions in schema flowvault from public, anon, authenticated;

-- ---------- entry points the app calls (all named fv_*) ----------

-- Creates the Flowvault profile, wallet and virtual card the first time a user signs in.
create or replace function public.fv_ensure_account()
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  u record; v_name text; v_pan text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if exists (select 1 from profiles where id = v_uid) then return; end if;
  select email, raw_user_meta_data into u from auth.users where id = v_uid;
  v_name := coalesce(nullif(u.raw_user_meta_data->>'full_name',''), split_part(u.email,'@',1));
  insert into profiles(id, full_name, phone) values (v_uid, v_name, u.raw_user_meta_data->>'phone')
    on conflict do nothing;
  insert into wallets(user_id) values (v_uid) on conflict do nothing;
  v_pan := '4187' || lpad((floor(random()*1e12))::bigint::text, 12, '0');  -- MOCK card number
  insert into cards(user_id, holder_name, last4, mock_pan, mock_cvv, exp_month, exp_year)
  values (v_uid, upper(v_name), right(v_pan,4), v_pan, lpad((floor(random()*1000))::int::text, 3, '0'),
          extract(month from now())::int, extract(year from now())::int + 3)
  on conflict do nothing;
end $$;

-- Everything the app shows, in one call.
create or replace function public.fv_state()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone) from profiles where id = auth.uid()),
    'balance', (select balance_kobo from wallets where user_id = auth.uid()),
    'card', (select jsonb_build_object('holder_name', holder_name, 'last4', last4, 'exp_month', exp_month,
              'exp_year', exp_year, 'network', network, 'frozen', frozen) from cards where user_id = auth.uid()),
    'subs', coalesce((select jsonb_agg(to_jsonb(s) - 'user_id' order by s.billing_day, s.created_at) from subscriptions s where s.user_id = auth.uid()), '[]'::jsonb),
    'txns', coalesce((select jsonb_agg(to_jsonb(t) - 'user_id' order by t.created_at desc)
              from (select * from transactions where user_id = auth.uid() order by created_at desc limit 200) t), '[]'::jsonb),
    'usd_rate', (select ngn_per_unit from fx_rates where currency = 'USD')
  );
$$;

-- MOCK: pretend a top-up arrived. Remove when real payments go live.
create or replace function public.fv_mock_top_up(p_amount_kobo bigint, p_method text)
returns bigint language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount_kobo < 10000 or p_amount_kobo > 100000000 then
    raise exception 'Top-ups must be between ₦100 and ₦1,000,000';
  end if;
  return credit_wallet(auth.uid(), p_amount_kobo,
    case when p_method = 'card' then 'Debit card top-up' else 'Bank transfer top-up' end,
    'Test money (mock payment)');
end $$;

-- MOCK: pretend the service just tried to charge this month's price.
create or replace function public.fv_mock_charge(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare s subscriptions;
begin
  select * into s from subscriptions where id = p_subscription and user_id = auth.uid();
  if s.id is null then raise exception 'Subscription not found'; end if;
  return authorize_charge(auth.uid(), s.id, s.price_minor, s.currency);
end $$;

create or replace function public.fv_add_subscription(p_name text, p_plan text, p_currency text, p_price_minor bigint, p_billing_day int, p_color text)
returns uuid language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into subscriptions(user_id, name, plan, currency, price_minor, billing_day, color)
  values (auth.uid(), trim(p_name), coalesce(nullif(trim(p_plan),''),'Monthly'), p_currency, p_price_minor, p_billing_day,
          case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#565a55' end)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.fv_update_subscription(p_id uuid, p_is_on boolean default null, p_price_guard boolean default null, p_remind boolean default null)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin
  update subscriptions set
    is_on = coalesce(p_is_on, is_on), price_guard = coalesce(p_price_guard, price_guard), remind = coalesce(p_remind, remind)
  where id = p_id and user_id = auth.uid();
  if not found then raise exception 'Subscription not found'; end if;
end $$;

create or replace function public.fv_delete_subscription(p_id uuid)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  delete from subscriptions where id = p_id and user_id = auth.uid();
$$;

create or replace function public.fv_update_card(p_frozen boolean)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set frozen = p_frozen where user_id = auth.uid();
$$;

create or replace function public.fv_reveal_card()
returns table(pan text, cvv text) language sql security definer set search_path = flowvault, pg_temp as $$
  select mock_pan, mock_cvv from cards where user_id = auth.uid();
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.fv_ensure_account()', 'public.fv_state()', 'public.fv_mock_top_up(bigint,text)', 'public.fv_mock_charge(uuid)',
    'public.fv_add_subscription(text,text,text,bigint,int,text)', 'public.fv_update_subscription(uuid,boolean,boolean,boolean)',
    'public.fv_delete_subscription(uuid)', 'public.fv_update_card(boolean)', 'public.fv_reveal_card()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
