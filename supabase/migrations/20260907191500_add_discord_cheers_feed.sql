alter table public.profiles
  add column if not exists share_cheers_discord boolean not null default false;

create table if not exists public.discord_cheers_announcements (
  pair_key text primary key,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  announced_at timestamptz not null default now()
);

alter table public.discord_cheers_announcements enable row level security;

revoke all on table public.discord_cheers_announcements from anon, authenticated;
