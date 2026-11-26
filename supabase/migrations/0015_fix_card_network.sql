-- The card's number is the truth for Visa vs Mastercard (Maplerad's sandbox can issue a Mastercard
-- even when Visa was asked for). The server corrects the stored network when the number disagrees.
create or replace function public.fv_server_fix_card_network(p_subscription uuid, p_network text)
returns void language sql security definer set search_path = flowvault, pg_temp as $$
  update cards set network = p_network where subscription_id = p_subscription and p_network in ('Visa', 'Mastercard') and network is distinct from p_network;
$$;
revoke all on function public.fv_server_fix_card_network(uuid, text) from public, anon, authenticated;
grant execute on function public.fv_server_fix_card_network(uuid, text) to service_role;
