-- Remove legacy duplicate auth signup trigger.
-- The old trigger called public.handle_new_user(), which inserts into profiles
-- without the required invite_code and now causes "Database error saving new user".
-- Keep only the hardened handle_new_user_profile() trigger.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();
