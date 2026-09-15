-- Keep device push tokens private to trusted backend functions.
-- Registration and unregistration both go through the authenticated Edge Function,
-- which performs storage changes with service-role access after validating the JWT.

create table if not exists public.device_push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists device_push_tokens_token_unique
  on public.device_push_tokens(token);
create index if not exists device_push_tokens_user_id_idx
  on public.device_push_tokens(user_id);

alter table public.device_push_tokens enable row level security;

revoke all on table public.device_push_tokens from anon;
revoke all on table public.device_push_tokens from authenticated;

drop policy if exists "users can delete own device push tokens" on public.device_push_tokens;
