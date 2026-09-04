-- Private-media columns were added after the earlier column-level privilege
-- hardening. Grant only the new path columns needed by the authenticated user's
-- existing own-profile / own-photo RLS-protected write flows.

revoke update on table public.profiles from authenticated;
grant update (
  name,
  age,
  bio,
  currently_up_for,
  is_active,
  city,
  latitude,
  longitude,
  avatar_url,
  avatar_path,
  gender
) on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (
  id,
  name,
  age,
  bio,
  currently_up_for,
  is_active,
  city,
  latitude,
  longitude,
  avatar_url,
  avatar_path,
  gender
) on table public.profiles to authenticated;

revoke insert, update on table public.profile_photos from authenticated;
grant insert (
  user_id,
  photo_url,
  storage_path,
  sort_order
) on table public.profile_photos to authenticated;
grant update (
  photo_url,
  storage_path,
  sort_order
) on table public.profile_photos to authenticated;

-- Explicitly keep server-managed Premium fields outside client write grants.
revoke update (is_premium, premium_until) on table public.profiles from authenticated;
