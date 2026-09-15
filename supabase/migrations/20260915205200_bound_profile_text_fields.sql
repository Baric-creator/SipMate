-- Mirror app-side profile input limits at the database boundary so direct client
-- writes cannot store oversized or unsupported profile values.

alter table public.profiles
  drop constraint if exists profiles_name_length_check,
  drop constraint if exists profiles_city_length_check,
  drop constraint if exists profiles_bio_length_check,
  drop constraint if exists profiles_gender_value_check;

alter table public.profiles
  add constraint profiles_name_length_check
    check (name is null or (char_length(pg_catalog.btrim(name)) between 1 and 50))
    not valid,
  add constraint profiles_city_length_check
    check (city is null or char_length(city) <= 80)
    not valid,
  add constraint profiles_bio_length_check
    check (bio is null or char_length(bio) <= 300)
    not valid,
  add constraint profiles_gender_value_check
    check (gender is null or gender in ('male', 'female', 'other'))
    not valid;
