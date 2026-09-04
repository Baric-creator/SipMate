-- Preparation for the private avatars bucket cutover.
-- IMPORTANT: this migration does not make the bucket private and does not remove
-- the legacy public-read policy, so currently deployed clients continue working.
-- The final cutover must remove "Public avatar read" and set buckets.public=false
-- only after supported clients resolve authorized media references.

begin;

drop policy if exists "Authenticated avatar read" on storage.objects;
create policy "Authenticated avatar read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.profiles target
      where target.id::text = (storage.foldername(name))[1]
        and not public.is_blocked_between((select auth.uid()), target.id)
    )
  )
);

commit;
