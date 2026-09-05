-- Final client privacy boundary for profile data.
-- Keep direct reads available only for the authenticated user's own rows.
-- Cross-user reads must use the privacy-preserving RPCs.

begin;

drop policy if exists "Users can view unblocked profiles" on public.profiles;
drop policy if exists "Authenticated users can view unblocked profile photos" on public.profile_photos;

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can view own profile photos"
on public.profile_photos
for select
to authenticated
using ((select auth.uid()) = user_id);

commit;
