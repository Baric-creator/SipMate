-- Keep push-token input bounded even if a future trusted backend path bypasses
-- the register-push-token Edge Function. NOT VALID avoids blocking rollout on
-- historical rows while enforcing the constraint for new/updated rows.

alter table public.device_push_tokens
  drop constraint if exists device_push_tokens_token_length_check;

alter table public.device_push_tokens
  add constraint device_push_tokens_token_length_check
  check (char_length(token) between 1 and 256)
  not valid;
