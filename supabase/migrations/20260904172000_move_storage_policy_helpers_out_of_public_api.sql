create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.can_upload_avatar_object(text) set schema private;
alter function public.can_update_avatar_object(text) set schema private;

revoke all on function private.can_upload_avatar_object(text) from public, anon;
revoke all on function private.can_update_avatar_object(text) from public, anon;
grant execute on function private.can_upload_avatar_object(text) to authenticated, service_role;
grant execute on function private.can_update_avatar_object(text) to authenticated, service_role;
