alter table public.conversations
  add constraint conversations_canonical_pair
  check (user_one < user_two);
