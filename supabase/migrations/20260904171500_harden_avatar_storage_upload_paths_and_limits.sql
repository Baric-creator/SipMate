create or replace function public.can_upload_avatar_object(object_name text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  caller_id uuid := auth.uid();
  file_name text;
  gallery_count integer;
  premium_active boolean;
begin
  if caller_id is null or object_name is null then
    return false;
  end if;

  if split_part(object_name, '/', 1) <> caller_id::text
     or split_part(object_name, '/', 2) = ''
     or split_part(object_name, '/', 3) <> '' then
    return false;
  end if;

  file_name := lower(split_part(object_name, '/', 2));

  if file_name in ('avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.webp') then
    return true;
  end if;

  if file_name !~ '^gallery-[0-9]+\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;

  select coalesce(p.is_premium = true and (p.premium_until is null or p.premium_until > now()), false)
  into premium_active
  from public.profiles p
  where p.id = caller_id;

  if not coalesce(premium_active, false) then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  select count(*)
  into gallery_count
  from storage.objects o
  where o.bucket_id = 'avatars'
    and split_part(o.name, '/', 1) = caller_id::text
    and lower(split_part(o.name, '/', 2)) ~ '^gallery-[0-9]+\.(jpg|jpeg|png|webp)$';

  return gallery_count < 6;
end;
$$;

create or replace function public.can_update_avatar_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public, storage
as $$
declare
  caller_id uuid := auth.uid();
  file_name text;
  premium_active boolean;
begin
  if caller_id is null or object_name is null then
    return false;
  end if;

  if split_part(object_name, '/', 1) <> caller_id::text
     or split_part(object_name, '/', 2) = ''
     or split_part(object_name, '/', 3) <> '' then
    return false;
  end if;

  file_name := lower(split_part(object_name, '/', 2));

  if file_name in ('avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.webp') then
    return true;
  end if;

  if file_name !~ '^gallery-[0-9]+\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;

  select coalesce(p.is_premium = true and (p.premium_until is null or p.premium_until > now()), false)
  into premium_active
  from public.profiles p
  where p.id = caller_id;

  return coalesce(premium_active, false);
end;
$$;

revoke all on function public.can_upload_avatar_object(text) from public, anon;
revoke all on function public.can_update_avatar_object(text) from public, anon;
grant execute on function public.can_upload_avatar_object(text) to authenticated, service_role;
grant execute on function public.can_update_avatar_object(text) to authenticated, service_role;

drop policy if exists "Users can upload own avatar" on storage.objects;
drop policy if exists "Users can update own avatar" on storage.objects;

create policy "Users can upload approved avatar files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and public.can_upload_avatar_object(name)
);

create policy "Users can update approved avatar files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and public.can_update_avatar_object(name)
)
with check (
  bucket_id = 'avatars'
  and public.can_update_avatar_object(name)
);
