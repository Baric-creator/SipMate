drop policy if exists "Chat participants can receive typing broadcasts" on realtime.messages;
drop policy if exists "Chat participants can send typing broadcasts" on realtime.messages;

create policy "Chat participants can receive typing broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.conversations c
    where ('chat-' || c.id::text) = (select realtime.topic())
      and ((select auth.uid()) = c.user_one or (select auth.uid()) = c.user_two)
  )
);

create policy "Chat participants can send typing broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.conversations c
    where ('chat-' || c.id::text) = (select realtime.topic())
      and ((select auth.uid()) = c.user_one or (select auth.uid()) = c.user_two)
      and not public.is_blocked_between(c.user_one, c.user_two)
  )
);
