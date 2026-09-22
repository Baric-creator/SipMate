create or replace function public.get_my_premium_entitlement()
returns table(is_premium boolean, premium_until timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    coalesce(p.is_premium = true and (p.premium_until is null or p.premium_until > now()), false) as is_premium,
    p.premium_until
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.get_my_premium_entitlement() from public;
grant execute on function public.get_my_premium_entitlement() to authenticated;
