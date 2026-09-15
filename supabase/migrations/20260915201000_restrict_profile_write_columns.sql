-- Premium and integration state must stay backend-authoritative even if an RLS
-- policy allows a user to write their own profile row. Remove broad write grants
-- and grant only intended client fields. `is_premium` remains in the narrow grant
-- only because the legacy missing-profile fallback upsert sends `false`; a trigger
-- below makes that column immutable for authenticated clients and independently
-- enforces row ownership for client writes.

create or replace function public.protect_profile_authoritative_fields()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if auth.role() = 'authenticated' then
    if caller_id is null then
      raise exception 'Authentication required';
    end if;

    if tg_op = 'INSERT' then
      if new.id <> caller_id then
        raise exception 'Cannot create another user''s profile';
      end if;
      new.is_premium := false;
    else
      if old.id <> caller_id or new.id <> old.id then
        raise exception 'Cannot update another user''s profile';
      end if;
      new.is_premium := old.is_premium;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_authoritative_fields() from public;

drop trigger if exists protect_profile_authoritative_fields on public.profiles;
create trigger protect_profile_authoritative_fields
before insert or update on public.profiles
for each row
execute function public.protect_profile_authoritative_fields();

revoke insert on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
revoke delete on table public.profiles from authenticated;

revoke insert (
  premium_until,
  discord_user_id,
  discord_username,
  discord_connected_at
) on table public.profiles from authenticated;

revoke update (
  premium_until,
  discord_user_id,
  discord_username,
  discord_connected_at
) on table public.profiles from authenticated;

grant insert (
  id,
  name,
  age,
  city,
  bio,
  currently_up_for,
  is_active,
  last_seen_at,
  active_until,
  avatar_url,
  gender,
  latitude,
  longitude,
  share_cheers_discord,
  is_premium
) on table public.profiles to authenticated;

grant update (
  name,
  age,
  city,
  bio,
  currently_up_for,
  is_active,
  last_seen_at,
  active_until,
  avatar_url,
  gender,
  latitude,
  longitude,
  share_cheers_discord,
  is_premium
) on table public.profiles to authenticated;
