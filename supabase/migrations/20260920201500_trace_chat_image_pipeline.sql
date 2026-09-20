alter table public.chat_image_safety_events
  drop constraint if exists chat_image_safety_events_outcome_check;

alter table public.chat_image_safety_events
  add constraint chat_image_safety_events_outcome_check
  check (outcome in (
    'attempt_received',
    'upload_missing',
    'both_premium_required',
    'mutual_cheers_required',
    'file_too_large',
    'unsupported_image_type',
    'verification_not_configured',
    'verification_failed',
    'ai_rejected',
    'unsafe_rejected',
    'approved'
  ));
