create table if not exists public.places_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.places_cache enable row level security;

create index if not exists places_cache_expires_at_idx
  on public.places_cache (expires_at);

comment on table public.places_cache is
  'Server-only short-lived cache for Premium SipMate Spots venue lookups. Precise user coordinates are not stored.';
