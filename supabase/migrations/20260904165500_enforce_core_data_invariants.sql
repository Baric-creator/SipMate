alter table public.cheers
  add constraint cheers_no_self check (sender_id <> receiver_id);

alter table public.profiles
  add constraint profiles_latitude_range check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint profiles_longitude_range check (longitude is null or (longitude >= -180 and longitude <= 180)),
  add constraint profiles_location_pair check ((latitude is null) = (longitude is null));

create unique index profile_photos_user_sort_order_unique
  on public.profile_photos(user_id, sort_order)
  where sort_order is not null;

-- Consolidated from 20260904165500_serialize_profile_photo_limit_checks.sql because Supabase migration versions are keyed by timestamp.
create or replace function public.enforce_profile_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  photo_count integer;
begin
  if new.user_id is null then
    raise exception 'Profile photo owner is required';
  end if;

  -- Prevent concurrent uploads for one user from racing past the six-photo cap.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));

  select count(*) into photo_count
  from public.profile_photos
  where user_id = new.user_id;

  if photo_count >= 6 then
    raise exception 'Maximum 6 profile photos allowed';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_photo_limit() from public, anon, authenticated;
