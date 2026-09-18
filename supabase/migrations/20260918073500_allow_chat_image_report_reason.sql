alter table public.reports drop constraint if exists reports_valid_reason;

alter table public.reports
  add constraint reports_valid_reason
  check (reason = any (array[
    'inappropriate_behavior'::text,
    'harassment'::text,
    'fake_profile'::text,
    'spam'::text,
    'other'::text,
    'inappropriate_image'::text
  ]));
