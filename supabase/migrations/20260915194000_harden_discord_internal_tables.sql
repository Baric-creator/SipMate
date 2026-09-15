-- Discord OAuth state and public-feed announcement reservations are internal
-- server-side bookkeeping. App clients never need direct table access.

alter table public.discord_oauth_states enable row level security;
alter table public.discord_cheers_announcements enable row level security;

revoke all on table public.discord_oauth_states from anon;
revoke all on table public.discord_oauth_states from authenticated;
revoke all on table public.discord_cheers_announcements from anon;
revoke all on table public.discord_cheers_announcements from authenticated;
