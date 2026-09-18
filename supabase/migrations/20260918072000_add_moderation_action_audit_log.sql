create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (action in ('reviewed','dismissed','reopened','photo_removed')),
  admin_user_id uuid,
  reported_user_id uuid,
  reported_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;
revoke all on table public.moderation_actions from anon, authenticated;

create index if not exists moderation_actions_created_at_idx
  on public.moderation_actions (created_at desc);

create index if not exists moderation_actions_report_id_idx
  on public.moderation_actions (report_id);
