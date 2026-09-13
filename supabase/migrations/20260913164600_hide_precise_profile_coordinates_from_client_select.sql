revoke select on table public.profiles from authenticated;

grant select (
  id,
  name,
  age,
  bio,
  currently_up_for,
  is_active,
  city,
  avatar_url,
  created_at,
  is_premium,
  premium_until,
  gender,
  discord_user_id,
  discord_username,
  discord_connected_at,
  share_cheers_discord,
  last_seen_at
) on table public.profiles to authenticated;
