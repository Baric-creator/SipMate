drop policy if exists "Users can send messages in unblocked own conversations" on public.messages;

create policy "Users can send messages in entitled unblocked conversations"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = messages.conversation_id
      and ((select auth.uid()) = c.user_one or (select auth.uid()) = c.user_two)
      and not public.is_blocked_between(c.user_one, c.user_two)
      and (
        exists (
          select 1 from public.profiles p
          where p.id in (c.user_one, c.user_two)
            and p.is_premium = true
            and (p.premium_until is null or p.premium_until > now())
        )
        or (
          exists (select 1 from public.cheers c1 where c1.sender_id = c.user_one and c1.receiver_id = c.user_two)
          and exists (select 1 from public.cheers c2 where c2.sender_id = c.user_two and c2.receiver_id = c.user_one)
        )
      )
  )
);

-- Consolidated from 20260904173000_minimize_client_table_privileges.sql because Supabase migration versions are keyed by timestamp.
revoke all privileges on all tables in schema public from anon;

revoke truncate, trigger, references on all tables in schema public from authenticated;

revoke update on table public.blocks, public.cheers, public.conversations, public.reports, public.skipped_profiles from authenticated;
revoke delete on table public.conversations, public.messages, public.premium_offers, public.premium_subscriptions, public.profiles, public.reports from authenticated;
revoke insert, update, delete on table public.premium_offers, public.premium_subscriptions from authenticated;
