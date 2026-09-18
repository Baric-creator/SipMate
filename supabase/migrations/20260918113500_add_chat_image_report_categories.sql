alter table public.reports drop constraint if exists reports_valid_reason;

alter table public.reports
  add constraint reports_valid_reason
  check (reason = any (array[
    'inappropriate_behavior'::text,
    'harassment'::text,
    'fake_profile'::text,
    'spam'::text,
    'other'::text,
    'inappropriate_image'::text,
    'photo_sexual_content'::text,
    'photo_harassment'::text,
    'photo_spam_scam'::text,
    'photo_other'::text
  ]));
