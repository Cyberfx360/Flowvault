-- Flowvault's margin on top of Maplerad's $5.15 card cost (Maplerad lets the business add its own
-- margin on issuance and funding; it suggests no amount). $1.30 makes $6.45, ₦10,000 at ₦1,550/$.
-- Change it with: update flowvault.settings set card_fee_margin_usd_cents = 130;
alter table flowvault.settings add column if not exists card_fee_margin_usd_cents int not null default 130 check (card_fee_margin_usd_cents >= 0);

create or replace function flowvault.current_card_fee_kobo()
returns bigint language sql stable security definer set search_path = flowvault, pg_temp as $$
  select case when s.card_fee_usd_cents is null then s.card_fee_kobo
              else (ceil((s.card_fee_usd_cents + s.card_fee_margin_usd_cents) * coalesce(r.ngn_per_unit, 1550) / 10000.0) * 10000)::bigint end
  from settings s left join fx_rates r on r.currency = 'USD';
$$;
revoke all on function flowvault.current_card_fee_kobo() from public, anon, authenticated;
