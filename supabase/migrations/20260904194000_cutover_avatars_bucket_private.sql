-- FINAL RELEASE-CUTOVER migration. Do not apply ahead of a client release that
-- resolves avatar/gallery storage paths through authenticated or signed URLs.
--
-- Fail closed: every SipMate Storage URL must be backfilled to a private path,
-- every referenced private path must still exist in Storage, and the authenticated
-- read policy/helper must already be present before public access is removed.

begin;

do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'avatars'
  ) then
    raise exception 'private-media cutover blocked: avatars bucket is missing';
  end if;

  if to_regprocedure('private.can_read_avatar_object(text)') is null then
    raise exception 'private-media cutover blocked: private.can_read_avatar_object(text) is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated avatar read'
      and cmd = 'SELECT'
  ) then
    raise exception 'private-media cutover blocked: authenticated avatar read policy is missing';
  end if;

  if exists (
    select 1
    from public.profiles
    where avatar_url like '%/storage/v1/object/public/avatars/%'
      and avatar_path is null
  ) then
    raise exception 'private-media cutover blocked: profile avatar URL is missing avatar_path backfill';
  end if;

  if exists (
    select 1
    from public.profile_photos
    where photo_url like '%/storage/v1/object/public/avatars/%'
      and storage_path is null
  ) then
    raise exception 'private-media cutover blocked: gallery URL is missing storage_path backfill';
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.avatar_path is not null
      and not exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'avatars'
          and o.name = p.avatar_path
      )
  ) then
    raise exception 'private-media cutover blocked: referenced profile avatar object is missing';
  end if;

  if exists (
    select 1
    from public.profile_photos ph
    where ph.storage_path is not null
      and not exists (
        select 1
        from storage.objects o
        where o.bucket_id = 'avatars'
          and o.name = ph.storage_path
      )
  ) then
    raise exception 'private-media cutover blocked: referenced gallery object is missing';
  end if;
end;
$$;

drop policy if exists "Public avatar read" on storage.objects;

update storage.buckets
set public = false
where id = 'avatars';

commit;
