alter table public.profile_photos
  drop constraint if exists profile_photos_url_owned_storage;

alter table public.profile_photos
  add constraint profile_photos_url_owned_storage
  check (
    photo_url ~ (
      '^https://poatmbsfglhrcdbosinb\.supabase\.co/storage/v1/object/public/avatars/'::text
      || user_id::text
      || '/gallery-[0-9]+-[a-z0-9]+\.(jpg|jpeg|png|webp)(\?.*)?$'::text
    )
  );
