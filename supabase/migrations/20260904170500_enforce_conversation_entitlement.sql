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

-- Consolidated from 20260904170500_harden_profile_and_message_text_bounds.sql because Supabase migration versions are keyed by timestamp.
alter table public.profiles
  add constraint profiles_age_range check (age is null or (age >= 18 and age <= 120)),
  add constraint profiles_name_not_blank check (name is not null and btrim(name) <> ''),
  add constraint profiles_name_length check (length(name) <= 60),
  add constraint profiles_city_length check (city is null or length(city) <= 120),
  add constraint profiles_bio_length check (bio is null or length(bio) <= 500),
  add constraint profiles_activity_length check (currently_up_for is null or length(currently_up_for) <= 40);

alter table public.messages
  add constraint messages_content_length check (length(content) <= 2000);
