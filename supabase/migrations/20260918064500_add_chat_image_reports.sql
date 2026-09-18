alter table public.reports
  add column if not exists report_kind text not null default 'profile',
  add column if not exists reported_message_id uuid references public.messages(id) on delete set null;

do $$ begin
  alter table public.reports
    add constraint reports_report_kind_check check (report_kind in ('profile','chat_image'));
exception when duplicate_object then null; end $$;

create unique index if not exists reports_unique_chat_image_reporter_idx
on public.reports (reporter_id, reported_message_id)
where report_kind = 'chat_image' and reported_message_id is not null;

create index if not exists reports_reported_message_id_idx
on public.reports (reported_message_id)
where reported_message_id is not null;
