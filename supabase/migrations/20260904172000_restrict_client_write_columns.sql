revoke update on table public.messages from authenticated;
grant update (read_at) on table public.messages to authenticated;
revoke insert on table public.messages from authenticated;
grant insert (conversation_id, sender_id, content) on table public.messages to authenticated;

revoke insert on table public.conversations from authenticated;
grant insert (user_one, user_two) on table public.conversations to authenticated;

revoke insert on table public.cheers from authenticated;
grant insert (sender_id, receiver_id) on table public.cheers to authenticated;

revoke insert on table public.blocks from authenticated;
grant insert (blocker_id, blocked_id) on table public.blocks to authenticated;

revoke insert on table public.reports from authenticated;
grant insert (reporter_id, reported_id, reason, details) on table public.reports to authenticated;

revoke insert on table public.skipped_profiles from authenticated;
grant insert (user_id, skipped_user_id) on table public.skipped_profiles to authenticated;

revoke insert, update on table public.profile_photos from authenticated;
grant insert (user_id, photo_url, sort_order) on table public.profile_photos to authenticated;
grant update (photo_url, sort_order) on table public.profile_photos to authenticated;
