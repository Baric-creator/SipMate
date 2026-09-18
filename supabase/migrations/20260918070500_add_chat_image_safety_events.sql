create table if not exists public.chat_image_safety_events (
  id uuid primary key default gen_random_uuid(),
  outcome text not null check (outcome in ('ai_rejected','unsafe_rejected','verification_failed')),
  ai_score numeric,
  nsfw_score numeric,
  created_at timestamptz not null default now()
);

alter table public.chat_image_safety_events enable row level security;
revoke all on table public.chat_image_safety_events from anon, authenticated;

create index if not exists chat_image_safety_events_outcome_created_at_idx
  on public.chat_image_safety_events (outcome, created_at desc);
