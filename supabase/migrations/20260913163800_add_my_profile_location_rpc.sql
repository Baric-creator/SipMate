create or replace function public.get_my_profile_location()
returns table(latitude double precision, longitude double precision, city text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.latitude, p.longitude, p.city
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_profile_location() from public;
grant execute on function public.get_my_profile_location() to authenticated;
