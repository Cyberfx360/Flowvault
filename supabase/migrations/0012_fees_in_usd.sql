-- Every Flowvault fee is shown in dollars (Kenneth, 26 Nov). Wallets stay in Naira, so a fee still takes
-- Naira from the wallet, but its History row also records the dollar amount (transactions.usd_cents).
-- Nothing is deleted.
alter table flowvault.transactions add column if not exists usd_cents int check (usd_cents >= 0);
alter table flowvault.cards add column if not exists fee_paid_usd_cents int;

create or replace function flowvault.take_card_fee(p_subscription uuid)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards; v_fee bigint; v_usd int; v_bal bigint; v_name text;
begin
  select * into c from cards where subscription_id = p_subscription for update;
  if c.id is null then raise exception 'No card for this subscription'; end if;
  if c.provider = 'mock' or c.fee_paid_kobo > 0 then return 'ok'; end if;
  v_fee := current_card_fee_kobo();
  v_usd := current_card_fee_usd_cents();
  if coalesce(v_fee, 0) = 0 then return 'ok'; end if;
  select balance_kobo into v_bal from wallets where user_id = c.user_id for update;
  if coalesce(v_bal, 0) < v_fee then
    update cards set status = 'failed', last_error = 'Insufficient balance' where id = c.id;
    return 'insufficient';
  end if;
  select name into v_name from subscriptions where id = p_subscription;
  update wallets set balance_kobo = balance_kobo - v_fee, updated_at = now() where user_id = c.user_id;
  update cards set fee_paid_kobo = v_fee, fee_paid_usd_cents = v_usd where id = c.id;
  insert into transactions(user_id, kind, status, amount_kobo, usd_cents, title, detail, subscription_id)
    values (c.user_id, 'charge', 'success', v_fee, v_usd, 'Card fee', 'New card for ' || coalesce(v_name, 'a subscription'), p_subscription);
  return 'ok';
end $$;
revoke all on function flowvault.take_card_fee(uuid) from public, anon, authenticated;

create or replace function flowvault.refund_card_fee(p_card uuid)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare c cards; v_name text;
begin
  select * into c from cards where id = p_card for update;
  if c.id is null or c.fee_paid_kobo = 0 then return; end if;
  select name into v_name from subscriptions where id = c.subscription_id;
  update wallets set balance_kobo = balance_kobo + c.fee_paid_kobo, updated_at = now() where user_id = c.user_id;
  insert into transactions(user_id, kind, status, amount_kobo, usd_cents, title, detail, subscription_id)
    values (c.user_id, 'topup', 'success', c.fee_paid_kobo, c.fee_paid_usd_cents, 'Card fee refund', 'Card for ' || coalesce(v_name, 'a subscription') || ' wasn''t made', c.subscription_id);
  update cards set fee_paid_kobo = 0, fee_paid_usd_cents = null where id = c.id;
end $$;
revoke all on function flowvault.refund_card_fee(uuid) from public, anon, authenticated;
