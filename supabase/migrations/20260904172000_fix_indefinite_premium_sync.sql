-- Keep profile Premium state consistent when an active subscription has no expiry.
-- A NULL expires_at is treated elsewhere as indefinite active access.

create or replace function public.sync_profile_premium_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  has_indefinite boolean := false;
  finite_active_until timestamptz;
  premium_active boolean := false;
begin
  select
    coalesce(bool_or(expires_at is null), false),
    max(expires_at) filter (where expires_at is not null)
  into has_indefinite, finite_active_until
  from public.premium_subscriptions
  where user_id = p_user_id
    and status = 'active'
    and (expires_at is null or expires_at > now());

  premium_active := has_indefinite or finite_active_until is not null;

  update public.profiles
  set
    is_premium = premium_active,
    premium_until = case when has_indefinite then null else finite_active_until end
  where id = p_user_id;
end;
$$;

revoke all on function public.sync_profile_premium_status(uuid) from public, anon, authenticated;
grant execute on function public.sync_profile_premium_status(uuid) to service_role;

-- Consolidated from 20260904172000_move_storage_policy_helpers_out_of_public_api.sql because Supabase migration versions are keyed by timestamp.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.can_upload_avatar_object(text) set schema private;
alter function public.can_update_avatar_object(text) set schema private;

revoke all on function private.can_upload_avatar_object(text) from public, anon;
revoke all on function private.can_update_avatar_object(text) from public, anon;
grant execute on function private.can_upload_avatar_object(text) to authenticated, service_role;
grant execute on function private.can_update_avatar_object(text) to authenticated, service_role;

-- Consolidated from 20260904172000_restrict_client_write_columns.sql because Supabase migration versions are keyed by timestamp.
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
