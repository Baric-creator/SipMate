create table if not exists public.places_cache (
  cache_key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.places_cache enable row level security;

-- The cache is an implementation detail of the Edge Function. Client roles
-- should not read or mutate cached venue payloads directly; the service-role
-- client inside nearby-places is the only intended accessor.
revoke all on table public.places_cache from anon;
revoke all on table public.places_cache from authenticated;

create index if not exists places_cache_expires_at_idx
  on public.places_cache (expires_at);

comment on table public.places_cache is
  'Server-only short-lived cache for Premium SipMate Spots venue lookups. Precise user coordinates are not stored.';
