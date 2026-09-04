create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.blocks
    where
      (blocker_id = user_a and blocked_id = user_b)
      or
      (blocker_id = user_b and blocked_id = user_a)
  );
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
