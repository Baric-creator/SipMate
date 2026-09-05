-- Keep database media references aligned with the Storage upload policy.
-- A profile may reference only its canonical avatar object and gallery rows may
-- reference only numbered gallery objects owned by the same user.

begin;

alter table public.profiles
  drop constraint if exists profiles_avatar_path_owned_check;
alter table public.profiles
  drop constraint if exists profiles_avatar_path_approved_check;
alter table public.profiles
  add constraint profiles_avatar_path_approved_check
  check (
    avatar_path is null
    or avatar_path ~ (
      '^'
      || id::text
      || '/avatar\.(jpg|jpeg|png|webp)$'
    )
  );

alter table public.profile_photos
  drop constraint if exists profile_photos_storage_path_owned_check;
alter table public.profile_photos
  drop constraint if exists profile_photos_storage_path_approved_check;
alter table public.profile_photos
  add constraint profile_photos_storage_path_approved_check
  check (
    storage_path is null
    or storage_path ~ (
      '^'
      || user_id::text
      || '/gallery-[0-9]+\.(jpg|jpeg|png|webp)$'
    )
  );

comment on constraint profiles_avatar_path_approved_check on public.profiles is
  'Profile avatar paths are restricted to the owning UUID folder and canonical avatar filename.';
comment on constraint profile_photos_storage_path_approved_check on public.profile_photos is
  'Gallery paths are restricted to the owning UUID folder and numbered gallery filenames.';

commit;
