-- The app is locked until the user's BVN (tier 1) and NIN + selfie (tier 2) are checked.
-- middleware.ts calls this on every app page. Nothing is deleted.
create or replace function public.fv_is_verified()
returns boolean language sql stable security definer set search_path = flowvault, pg_temp as $$
  select coalesce((select provider_customer_id is not null and coalesce(provider_tier, 0) >= 2 from profiles where id = auth.uid()), false);
$$;
revoke all on function public.fv_is_verified() from public, anon;
grant execute on function public.fv_is_verified() to authenticated;
