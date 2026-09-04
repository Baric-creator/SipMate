alter table public.profiles
  add constraint profiles_avatar_url_owned_storage check (
    avatar_url is null
    or avatar_url ~ (
      '^https://poatmbsfglhrcdbosinb\.supabase\.co/storage/v1/object/public/avatars/'
      || id::text
      || '/avatar\.(jpg|jpeg|png|webp)(\?.*)?$'
    )
  );

alter table public.profile_photos
  add constraint profile_photos_url_owned_storage check (
    photo_url ~ (
      '^https://poatmbsfglhrcdbosinb\.supabase\.co/storage/v1/object/public/avatars/'
      || user_id::text
      || '/gallery-[0-9]+\.(jpg|jpeg|png|webp)(\?.*)?$'
    )
  );
