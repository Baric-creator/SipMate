alter table public.messages
  add constraint messages_content_not_blank check (btrim(content) <> '');

alter table public.profile_photos
  add constraint profile_photos_sort_order_nonnegative check (sort_order is null or sort_order >= 0);
