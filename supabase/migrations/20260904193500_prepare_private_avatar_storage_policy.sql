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
begin
  if caller_id is null or object_name is null or btrim(object_name) = '' then
    return false;
  end if;

  owner_text := split_part(object_name, '/', 1);
  begin
    owner_id := owner_text::uuid;
  exception
    when invalid_text_representation then
      return false;
  end;

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

  return not public.is_blocked_between(caller_id, owner_id);
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
