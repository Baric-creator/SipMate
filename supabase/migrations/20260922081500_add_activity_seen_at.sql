alter table public.profiles
  add column if not exists activity_seen_at timestamptz;

grant select (activity_seen_at) on table public.profiles to authenticated;
grant update (activity_seen_at) on table public.profiles to authenticated;
