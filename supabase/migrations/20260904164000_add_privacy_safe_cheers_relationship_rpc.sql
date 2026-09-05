create or replace function public.get_cheers_relationship(target_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_sent boolean;
  target_sent boolean;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if target_user_id is null or target_user_id = caller_id then return 'none'; end if;
  if public.is_blocked_between(caller_id, target_user_id) then return 'none'; end if;

  select exists (
    select 1 from public.cheers
    where sender_id = caller_id and receiver_id = target_user_id
  ) into caller_sent;

  if not caller_sent then return 'none'; end if;

  select exists (
    select 1 from public.cheers
    where sender_id = target_user_id and receiver_id = caller_id
  ) into target_sent;

  return case when target_sent then 'mutual' else 'sent' end;
end;
$$;

revoke all on function public.get_cheers_relationship(uuid) from public, anon;
grant execute on function public.get_cheers_relationship(uuid) to authenticated, service_role;
