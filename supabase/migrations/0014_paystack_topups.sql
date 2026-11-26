-- Real wallet top-ups through Paystack (debit card or bank transfer). Nothing is deleted.
--
-- 1. The server creates a pending top-up with a unique reference and sends the user to Paystack.
-- 2. When Paystack confirms the payment (webhook, or the user coming back), the server checks it with
--    Paystack and calls fv_server_topup_paid(). That credits the wallet exactly once per reference,
--    and only for the amount Paystack says was paid.
-- 3. Pretend top-ups (fv_mock_top_up) switch off for good the first time a LIVE Paystack payment
--    arrives, so nobody can add free money once real money is flowing.

create table if not exists flowvault.topups (
  reference text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_kobo bigint not null check (amount_kobo > 0),
  channel text not null check (channel in ('card', 'bank_transfer')),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  live boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists topups_user_idx on flowvault.topups(user_id, created_at desc);
alter table flowvault.topups enable row level security;
revoke all on flowvault.topups from public, anon, authenticated;

alter table flowvault.settings add column if not exists mock_topups boolean not null default true;

create or replace function public.fv_server_topup_create(p_user uuid, p_reference text, p_amount_kobo bigint, p_channel text)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin
  if p_amount_kobo < 10000 or p_amount_kobo > 100000000 then raise exception 'Top-ups must be between ₦100 and ₦1,000,000'; end if;
  insert into topups(reference, user_id, amount_kobo, channel) values (p_reference, p_user, p_amount_kobo, p_channel);
end $$;

-- Returns 'credited', 'already' (done before) or 'unknown'. p_paid_kobo is what Paystack says was paid.
create or replace function public.fv_server_topup_paid(p_reference text, p_paid_kobo bigint, p_live boolean)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare t topups;
begin
  select * into t from topups where reference = p_reference for update;
  if t.reference is null then return 'unknown'; end if;
  if t.status = 'success' then return 'already'; end if;
  if p_paid_kobo < t.amount_kobo then raise exception 'Paid amount is less than the top-up'; end if;
  update topups set status = 'success', paid_at = now(), live = p_live where reference = p_reference;
  perform credit_wallet(t.user_id, t.amount_kobo,
    case when t.channel = 'card' then 'Debit card top-up' else 'Bank transfer top-up' end,
    case when p_live then 'Paystack' else 'Paystack test payment' end);
  if p_live then update settings set mock_topups = false; end if;
  return 'credited';
end $$;

create or replace function public.fv_server_topup_failed(p_reference text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update topups set status = 'failed' where reference = p_reference and status = 'pending';
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.fv_server_topup_create(uuid,text,bigint,text)', 'public.fv_server_topup_paid(text,bigint,boolean)',
    'public.fv_server_topup_failed(text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Pretend top-ups only while mock_topups is on.
create or replace function public.fv_mock_top_up(p_amount_kobo bigint, p_method text)
returns bigint language plpgsql security definer set search_path = flowvault, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not (select mock_topups from settings) then raise exception 'Test money is switched off. Please pay with card or bank transfer.'; end if;
  if p_amount_kobo < 10000 or p_amount_kobo > 100000000 then
    raise exception 'Top-ups must be between ₦100 and ₦1,000,000';
  end if;
  return credit_wallet(auth.uid(), p_amount_kobo,
    case when p_method = 'card' then 'Debit card top-up' else 'Bank transfer top-up' end,
    'Test money (mock payment)');
end $$;
revoke all on function public.fv_mock_top_up(bigint, text) from public, anon;
grant execute on function public.fv_mock_top_up(bigint, text) to authenticated;
