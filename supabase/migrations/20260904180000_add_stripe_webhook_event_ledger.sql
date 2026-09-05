create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing' check (status in ('processing','processed','failed')),
  attempts integer not null default 1 check (attempts > 0),
  first_received_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;
create index stripe_webhook_events_status_last_attempt_idx on public.stripe_webhook_events(status,last_attempt_at);
comment on table public.stripe_webhook_events is 'Server-only Stripe webhook idempotency and retry ledger.';
