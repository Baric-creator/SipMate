create or replace function public.get_profile_photos(target_user_id uuid)
returns table (
  id uuid,
  photo_url text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select pp.id, pp.photo_url, pp.sort_order
  from public.profile_photos pp
  where pp.user_id = target_user_id
    and auth.uid() is not null
    and (
      auth.uid() = target_user_id
      or not public.is_blocked_between(auth.uid(), target_user_id)
    )
  order by pp.sort_order asc nulls last, pp.created_at asc;
$$;

revoke all on function public.get_profile_photos(uuid) from public, anon;
grant execute on function public.get_profile_photos(uuid) to authenticated, service_role;
