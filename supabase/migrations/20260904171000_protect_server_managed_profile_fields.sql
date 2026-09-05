revoke update on table public.profiles from authenticated;
grant update (name, age, bio, currently_up_for, is_active, city, latitude, longitude, avatar_url, gender)
on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (id, name, age, bio, currently_up_for, is_active, city, latitude, longitude, avatar_url, gender)
on table public.profiles to authenticated;
