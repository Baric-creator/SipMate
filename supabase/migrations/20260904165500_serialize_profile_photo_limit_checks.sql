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
