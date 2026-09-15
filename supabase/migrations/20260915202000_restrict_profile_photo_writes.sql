-- Gallery rows are user-owned content. The insert trigger already enforces
-- ownership, current Premium entitlement and the six-photo limit. Narrow table
-- privileges and independently protect DELETE ownership as well.

create or replace function public.protect_profile_photo_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() = 'authenticated' then
    if auth.uid() is null or old.user_id <> auth.uid() then
      raise exception 'Cannot delete another user''s profile photo';
    end if;
  end if;
  return old;
end;
$$;

revoke all on function public.protect_profile_photo_delete() from public;

drop trigger if exists protect_profile_photo_delete on public.profile_photos;
create trigger protect_profile_photo_delete
before delete on public.profile_photos
for each row
execute function public.protect_profile_photo_delete();

revoke insert on table public.profile_photos from authenticated;
revoke update on table public.profile_photos from authenticated;
revoke delete on table public.profile_photos from authenticated;

grant insert (user_id, photo_url, sort_order)
on table public.profile_photos to authenticated;

grant delete on table public.profile_photos to authenticated;
