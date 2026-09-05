alter policy "Users can read messages from own conversations" on public.messages
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.user_one = (select auth.uid()) or c.user_two = (select auth.uid()))
  ));

alter policy "Participants can mark messages as read" on public.messages
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = (select auth.uid()) or c.user_two = (select auth.uid()))
    )
  )
  with check (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = (select auth.uid()) or c.user_two = (select auth.uid()))
    )
  );

alter policy "Users can send messages in unblocked own conversations" on public.messages
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.user_one = (select auth.uid()) or c.user_two = (select auth.uid()))
        and not is_blocked_between(c.user_one, c.user_two)
    )
  );
