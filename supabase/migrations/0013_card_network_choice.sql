-- Users pick Visa or Mastercard for each new card (Maplerad offers only these two, USD only; no Verve).
-- The server records the pick before asking Maplerad, so a retry makes the same kind of card.
-- Pass null to read the current choice. Only cards not yet made can be changed. Nothing is deleted.
create or replace function public.fv_server_card_network(p_subscription uuid, p_network text)
returns text language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare v text;
begin
  if p_network is not null and p_network not in ('Visa', 'Mastercard') then raise exception 'Pick Visa or Mastercard'; end if;
  if p_network is not null then
    update cards set network = p_network where subscription_id = p_subscription and status in ('pending', 'failed') and provider_ref is null;
  end if;
  select network into v from cards where subscription_id = p_subscription;
  return v;
end $$;
revoke all on function public.fv_server_card_network(uuid, text) from public, anon, authenticated;
grant execute on function public.fv_server_card_network(uuid, text) to service_role;
