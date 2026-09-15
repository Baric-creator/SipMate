-- Premium gallery rules must not rely only on the React client. Serialize inserts
-- through the owner's profile row so concurrent uploads cannot exceed the limit.

create or replace function public.enforce_profile_photo_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text := auth.role();
  premium_active boolean := false;
  current_photo_count integer := 0;
begin
  -- Trusted service-role maintenance may bypass end-user entitlement checks.
  if caller_id is null then
    if caller_role = 'service_role' then
      return new;
    end if;
    raise exception 'Authentication required';
  end if;

  if new.user_id <> caller_id then
    raise exception 'Cannot add photos to another profile';
  end if;

  -- Lock the owner row so two simultaneous uploads cannot both pass the count check.
  perform 1
  from public.profiles p
  where p.id = new.user_id
  for update;

  select coalesce(
    p.is_premium = true
      and (p.premium_until is null or p.premium_until > now()),
    false
  )
  into premium_active
  from public.profiles p
  where p.id = new.user_id;

  if not premium_active then
    raise exception 'Premium is required for profile gallery photos';
  end if;

  select count(*)::integer
  into current_photo_count
  from public.profile_photos pp
  where pp.user_id = new.user_id;

  if current_photo_count >= 6 then
    raise exception 'Profile gallery limit reached';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_photo_insert() from public;

drop trigger if exists enforce_profile_photo_insert on public.profile_photos;
create trigger enforce_profile_photo_insert
before insert on public.profile_photos
for each row
execute function public.enforce_profile_photo_insert();
