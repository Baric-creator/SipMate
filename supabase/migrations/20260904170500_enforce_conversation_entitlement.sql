drop policy if exists "Users can create unblocked own conversations" on public.conversations;

create policy "Users can create entitled unblocked conversations"
on public.conversations
for insert
to authenticated
with check (
  ((select auth.uid()) = user_one or (select auth.uid()) = user_two)
  and user_one <> user_two
  and not public.is_blocked_between(user_one, user_two)
  and (
    exists (
      select 1
      from public.profiles me
      where me.id = (select auth.uid())
        and me.is_premium = true
        and (me.premium_until is null or me.premium_until > now())
    )
    or (
      exists (
        select 1 from public.cheers c1
        where c1.sender_id = user_one and c1.receiver_id = user_two
      )
      and exists (
        select 1 from public.cheers c2
        where c2.sender_id = user_two and c2.receiver_id = user_one
      )
    )
  )
);
