drop policy if exists "Users can add own profile photos" on public.profile_photos;

create policy "Premium users can add own profile photos"
on public.profile_photos
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.profiles me
    where me.id = (select auth.uid())
      and me.is_premium = true
      and (me.premium_until is null or me.premium_until > now())
  )
);
