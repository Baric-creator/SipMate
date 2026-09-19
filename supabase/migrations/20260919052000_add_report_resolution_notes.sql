alter table public.reports
  add column if not exists resolution_reason text,
  add column if not exists moderator_note text;

alter table public.reports
  drop constraint if exists reports_resolution_reason_check;

alter table public.reports
  add constraint reports_resolution_reason_check
  check (
    resolution_reason is null or
    resolution_reason = any (array[
      'no_action'::text,
      'photo_removed'::text,
      'warning_issued'::text,
      'false_report'::text,
      'other'::text
    ])
  );

alter table public.reports
  drop constraint if exists reports_moderator_note_length;

alter table public.reports
  add constraint reports_moderator_note_length
  check (moderator_note is null or length(moderator_note) <= 500);

alter table public.moderation_actions
  add column if not exists resolution_reason text,
  add column if not exists note text;

revoke update (resolution_reason, moderator_note) on table public.reports from authenticated;
