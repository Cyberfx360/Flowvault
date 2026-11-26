-- Numbers for the admin page (/admin). Server only (service role). Nothing is deleted.
create or replace function public.fv_server_admin_stats()
returns jsonb language sql stable security definer set search_path = flowvault, pg_temp as $$
  select jsonb_build_object(
    'users', (select count(*) from profiles),
    'verified', (select count(*) from profiles where provider_customer_id is not null and coalesce(provider_tier, 0) >= 2),
    'bvn_only', (select count(*) from profiles where provider_customer_id is not null and coalesce(provider_tier, 1) < 2),
    'wallets_kobo', (select coalesce(sum(balance_kobo), 0) from wallets),
    'cards', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
               select provider || ':' || status as k, count(*) as n from cards where subscription_id is not null group by 1) x),
    'topups_kobo', (select coalesce(sum(amount_kobo), 0) from topups where status = 'success'),
    'topups_count', (select count(*) from topups where status = 'success'),
    'topups_pending', (select count(*) from topups where status = 'pending' and created_at > now() - interval '1 day'),
    'test_money_kobo', (select coalesce(sum(amount_kobo), 0) from transactions where kind = 'topup' and detail = 'Test money (mock payment)'),
    'fees_usd_cents', (select coalesce(sum(case when kind = 'charge' then usd_cents else -usd_cents end), 0) from transactions where title like 'Card fee%' and usd_cents is not null),
    'fees_kobo', (select coalesce(sum(case when kind = 'charge' then amount_kobo else -amount_kobo end), 0) from transactions where title like 'Card fee%'),
    'mock_topups', (select mock_topups from settings),
    'card_fee_usd_cents', current_card_fee_usd_cents(),
    'usd_rate', (select ngn_per_unit from fx_rates where currency = 'USD'),
    'recent_topups', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select t.reference, t.amount_kobo, t.channel, t.status, t.live, t.created_at, p.full_name
        from topups t left join profiles p on p.id = t.user_id order by t.created_at desc limit 15) x), '[]'::jsonb),
    'failed_cards', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select s.name, c.last_error, c.created_at, p.full_name
        from cards c join subscriptions s on s.id = c.subscription_id left join profiles p on p.id = c.user_id
        where c.status = 'failed' and c.created_at > now() - interval '7 days' order by c.created_at desc limit 10) x), '[]'::jsonb)
  );
$$;
revoke all on function public.fv_server_admin_stats() from public, anon, authenticated;
grant execute on function public.fv_server_admin_stats() to service_role;
