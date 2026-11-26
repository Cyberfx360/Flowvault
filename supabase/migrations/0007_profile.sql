-- Profile page: lets a user change their name and phone number.
-- The name is locked once the ID check is done, because the card company has the verified name.
-- Nothing is deleted.
create or replace function public.fv_update_profile(p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = flowvault, pg_temp as $$
declare p profiles; v_name text := btrim(coalesce(p_full_name, '')); v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
begin
  select * into p from profiles where id = auth.uid() for update;
  if p.id is null then raise exception 'No profile'; end if;
  if length(v_name) < 2 or length(v_name) > 80 then raise exception 'Enter your full name'; end if;
  if v_phone is not null and v_phone !~ '^\+234[0-9]{10}$' then raise exception 'Enter a valid Nigerian phone number'; end if;
  if p.provider_customer_id is not null and coalesce(p.provider_tier, 0) >= 2 and v_name <> p.full_name then
    raise exception 'Your name is locked after the ID check';
  end if;
  update profiles set full_name = v_name, phone = v_phone where id = p.id;
end $$;
revoke all on function public.fv_update_profile(text, text) from public, anon;
grant execute on function public.fv_update_profile(text, text) to authenticated;
