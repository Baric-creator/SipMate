drop policy if exists "Users can add own profile photos" on public.profile_photos;

create policy "Premium users can add own profile photos"
on public.profile_photos
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.profiles me
    where me.id = (select auth.uid())
      and me.is_premium = true
      and (me.premium_until is null or me.premium_until > now())
  )
);

-- Consolidated from 20260904171000_protect_server_managed_profile_fields.sql because Supabase migration versions are keyed by timestamp.
revoke update on table public.profiles from authenticated;
grant update (name, age, bio, currently_up_for, is_active, city, latitude, longitude, avatar_url, gender)
on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
grant insert (id, name, age, bio, currently_up_for, is_active, city, latitude, longitude, avatar_url, gender)
on table public.profiles to authenticated;
