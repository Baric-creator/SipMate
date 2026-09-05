-- Preparation for the private avatars bucket cutover.
-- IMPORTANT: this migration does not make the bucket private and does not remove
-- the legacy public-read policy, so currently deployed clients continue working.
-- The final cutover must remove "Public avatar read" and set buckets.public=false
-- only after supported clients resolve authorized media references.

begin;

create or replace function private.can_read_avatar_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  owner_text text;
  owner_id uuid;
  object_leaf text;
begin
  if caller_id is null or object_name is null or btrim(object_name) = '' then
    return false;
  end if;

  -- SipMate media objects must live under exactly one user-owned UUID prefix.
  -- Reject root objects, empty leaves, absolute paths, traversal-like segments,
  -- and malformed owner prefixes before any authorization decision is made.
  if object_name like '/%'
     or object_name not like '%/%'
     or object_name like '%/../%'
     or object_name like '../%'
     or object_name like '%/..'
     or object_name like '%//%' then
    return false;
  end if;

  owner_text := split_part(object_name, '/', 1);
  object_leaf := substring(object_name from length(owner_text) + 2);

  if owner_text = '' or object_leaf is null or btrim(object_leaf) = '' then
    return false;
  end if;

  -- Reads are intentionally limited to the same canonical media namespace that
  -- upload/update policies accept. This prevents a future unrelated object in
  -- the avatars bucket from becoming readable merely because it shares a user's
  -- UUID folder.
  if lower(object_leaf) not in ('avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.webp')
     and lower(object_leaf) !~ '^gallery-[0-9]+\.(jpg|jpeg|png|webp)$' then
    return false;
  end if;

  begin
    owner_id := owner_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

  -- Canonicalize the UUID text so alternate textual forms cannot create a
  -- second namespace for the same owner.
  if owner_text <> owner_id::text then
    return false;
  end if;

  if owner_id = caller_id then
    return true;
  end if;

  if not exists (
    select 1
    from public.profiles target
    where target.id = owner_id
  ) then
    return false;
  end if;

  -- Cross-user reads must target media that is still referenced by the owner's
  -- current profile state. Canonical but stale/unreferenced objects remain
  -- readable only to their owner and cannot leak through a guessed object path.
  if lower(object_leaf) in ('avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.webp') then
    if not exists (
      select 1
      from public.profiles target
      where target.id = owner_id
        and target.avatar_path = object_name
    ) then
      return false;
    end if;
  else
    if not exists (
      select 1
      from public.profile_photos photo
      where photo.user_id = owner_id
        and photo.storage_path = object_name
    ) then
      return false;
    end if;
  end if;

  -- Keep this decision self-contained inside the SECURITY DEFINER helper rather
  -- than delegating to an invoker-security function. That makes the Storage
  -- policy independent of the caller's direct visibility into public.blocks.
  return not exists (
    select 1
    from public.blocks b
    where (b.blocker_id = caller_id and b.blocked_id = owner_id)
       or (b.blocker_id = owner_id and b.blocked_id = caller_id)
  );
end;
$$;

revoke all on function private.can_read_avatar_object(text) from public, anon;
grant execute on function private.can_read_avatar_object(text) to authenticated, service_role;

drop policy if exists "Authenticated avatar read" on storage.objects;
create policy "Authenticated avatar read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and private.can_read_avatar_object(name)
);

commit;
