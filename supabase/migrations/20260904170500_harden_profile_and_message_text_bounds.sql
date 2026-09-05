alter table public.profiles
  add constraint profiles_age_range check (age is null or (age >= 18 and age <= 120)),
  add constraint profiles_name_not_blank check (name is not null and btrim(name) <> ''),
  add constraint profiles_name_length check (length(name) <= 60),
  add constraint profiles_city_length check (city is null or length(city) <= 120),
  add constraint profiles_bio_length check (bio is null or length(bio) <= 500),
  add constraint profiles_activity_length check (currently_up_for is null or length(currently_up_for) <= 40);

alter table public.messages
  add constraint messages_content_length check (length(content) <= 2000);
