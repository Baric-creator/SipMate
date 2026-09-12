alter table public.reports
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists reports_status_created_at_idx
  on public.reports (status, created_at desc);
