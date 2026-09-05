drop policy if exists "Users can view profiles" on public.profiles;
create policy "Users can view unblocked profiles"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or not public.is_blocked_between((select auth.uid()), id)
);

drop policy if exists "Authenticated users can view profile photos" on public.profile_photos;
create policy "Authenticated users can view unblocked profile photos"
on public.profile_photos
for select
to authenticated
using (
  user_id = (select auth.uid())
  or not public.is_blocked_between((select auth.uid()), user_id)
);
