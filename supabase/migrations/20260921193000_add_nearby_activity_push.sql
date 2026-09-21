alter table public.profiles
  add column if not exists notify_nearby boolean not null default true,
  add column if not exists nearby_notify_radius_km double precision not null default 10;

alter table public.profiles
  drop constraint if exists profiles_nearby_notify_radius_km_check;

alter table public.profiles
  add constraint profiles_nearby_notify_radius_km_check
  check (nearby_notify_radius_km in (1,5,10,25));

grant select (notify_nearby, nearby_notify_radius_km)
on table public.profiles to authenticated;

grant update (notify_nearby, nearby_notify_radius_km)
on table public.profiles to authenticated;

create table if not exists public.nearby_notification_events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  activity_key text not null,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists nearby_notification_events_sender_created_idx
  on public.nearby_notification_events(sender_id, created_at desc);

alter table public.nearby_notification_events enable row level security;

revoke all on table public.nearby_notification_events from anon, authenticated;
