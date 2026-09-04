-- Keep profile Premium state consistent when an active subscription has no expiry.
-- A NULL expires_at is treated elsewhere as indefinite active access.

create or replace function public.sync_profile_premium_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  has_indefinite boolean := false;
  finite_active_until timestamptz;
  premium_active boolean := false;
begin
  select
    coalesce(bool_or(expires_at is null), false),
    max(expires_at) filter (where expires_at is not null)
  into has_indefinite, finite_active_until
  from public.premium_subscriptions
  where user_id = p_user_id
    and status = 'active'
    and (expires_at is null or expires_at > now());

  premium_active := has_indefinite or finite_active_until is not null;

  update public.profiles
  set
    is_premium = premium_active,
    premium_until = case when has_indefinite then null else finite_active_until end
  where id = p_user_id;
end;
$$;

revoke all on function public.sync_profile_premium_status(uuid) from public, anon, authenticated;
grant execute on function public.sync_profile_premium_status(uuid) to service_role;
