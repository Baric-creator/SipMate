alter table public.cheers
  add constraint cheers_no_self check (sender_id <> receiver_id);

alter table public.profiles
  add constraint profiles_latitude_range check (latitude is null or (latitude >= -90 and latitude <= 90)),
  add constraint profiles_longitude_range check (longitude is null or (longitude >= -180 and longitude <= 180)),
  add constraint profiles_location_pair check ((latitude is null) = (longitude is null));

create unique index profile_photos_user_sort_order_unique
  on public.profile_photos(user_id, sort_order)
  where sort_order is not null;
