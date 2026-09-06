create table if not exists public.discord_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

alter table public.discord_oauth_states enable row level security;

revoke all on public.discord_oauth_states from anon, authenticated;

create index if not exists discord_oauth_states_user_id_idx
  on public.discord_oauth_states(user_id);

create index if not exists discord_oauth_states_expires_at_idx
  on public.discord_oauth_states(expires_at);

create unique index if not exists profiles_discord_user_id_unique
  on public.profiles(discord_user_id)
  where discord_user_id is not null;
