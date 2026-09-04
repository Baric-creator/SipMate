-- FINAL RELEASE-CUTOVER migration. Do not apply ahead of a client release that
-- resolves avatar/gallery storage paths through authenticated or signed URLs.

begin;

drop policy if exists "Public avatar read" on storage.objects;

update storage.buckets
set public = false
where id = 'avatars';

commit;
