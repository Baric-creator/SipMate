create or replace function public.finalize_profile_photo_atomic(
  p_user_id uuid,
  p_photo_url text,
  p_limit integer default 10
)
returns table(id uuid, photo_url text, sort_order integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_next_sort integer;
  v_existing_id uuid;
  v_existing_url text;
  v_existing_sort integer;
begin
  if p_user_id is null or p_photo_url is null or length(trim(p_photo_url)) = 0 then
    raise exception using message = 'invalid_profile_photo', errcode = 'P0001';
  end if;

  if p_limit < 1 or p_limit > 50 then
    raise exception using message = 'invalid_gallery_limit', errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select pp.id, pp.photo_url, pp.sort_order
    into v_existing_id, v_existing_url, v_existing_sort
  from public.profile_photos pp
  where pp.user_id = p_user_id
    and pp.photo_url = p_photo_url
  limit 1;

  if found then
    return query select v_existing_id, v_existing_url, v_existing_sort;
    return;
  end if;

  select count(*), coalesce(max(pp.sort_order), -1) + 1
    into v_count, v_next_sort
  from public.profile_photos pp
  where pp.user_id = p_user_id;

  if v_count >= p_limit then
    raise exception using message = 'gallery_limit', errcode = 'P0001';
  end if;

  return query
  insert into public.profile_photos(user_id, photo_url, sort_order)
  values (p_user_id, p_photo_url, v_next_sort)
  returning profile_photos.id, profile_photos.photo_url, profile_photos.sort_order;
end;
$$;

revoke all on function public.finalize_profile_photo_atomic(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.finalize_profile_photo_atomic(uuid, text, integer) to service_role;
