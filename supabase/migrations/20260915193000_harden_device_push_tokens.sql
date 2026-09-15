-- Keep device push tokens private to the owning account.
-- Registration is performed by the service-role Edge Function; the app only needs
-- permission to remove its own token during logout.

alter table public.device_push_tokens enable row level security;

revoke all on table public.device_push_tokens from anon;
revoke all on table public.device_push_tokens from authenticated;
grant delete on table public.device_push_tokens to authenticated;

drop policy if exists "users can delete own device push tokens" on public.device_push_tokens;
create policy "users can delete own device push tokens"
on public.device_push_tokens
for delete
to authenticated
using (auth.uid() = user_id);
