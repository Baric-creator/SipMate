-- Premium and integration state must stay backend-authoritative even if an RLS
-- policy allows a user to update their own profile row. Remove broad write grants
-- and grant only fields that the app intentionally lets the user control.

revoke insert on table public.profiles from authenticated;
revoke update on table public.profiles from authenticated;
revoke delete on table public.profiles from authenticated;

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
  share_cheers_discord
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
  share_cheers_discord
) on table public.profiles to authenticated;
