-- Additive preparation for moving the avatars bucket from public URLs to private media.
-- Keep legacy *_url columns during the rollout so currently deployed clients continue to work.

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profile_photos
  add column if not exists storage_path text;

-- Backfill paths only from SipMate's avatars public-object URL shape. External URLs stay untouched.
update public.profiles
set avatar_path = split_part(
  split_part(avatar_url, '/storage/v1/object/public/avatars/')[2],
  '?', 1
)
where avatar_path is null
  and avatar_url like '%/storage/v1/object/public/avatars/%';

update public.profile_photos
set storage_path = split_part(
  split_part(photo_url, '/storage/v1/object/public/avatars/')[2],
  '?', 1
)
where storage_path is null
  and photo_url like '%/storage/v1/object/public/avatars/%';

-- A user may only reference objects under their own UUID folder.
alter table public.profiles
  drop constraint if exists profiles_avatar_path_owned_check;
alter table public.profiles
  add constraint profiles_avatar_path_owned_check
  check (avatar_path is null or avatar_path like id::text || '/%');

alter table public.profile_photos
  drop constraint if exists profile_photos_storage_path_owned_check;
alter table public.profile_photos
  add constraint profile_photos_storage_path_owned_check
  check (storage_path is null or storage_path like user_id::text || '/%');

-- Do not expose these columns through the public profile RPCs yet. A later cutover
-- will serve authorized media references after every supported client can resolve them.
