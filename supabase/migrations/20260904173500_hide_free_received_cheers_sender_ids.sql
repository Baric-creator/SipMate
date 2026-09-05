create or replace function private.can_reveal_received_cheers(other_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  premium_active boolean := false;
begin
  if caller_id is null or other_user_id is null or caller_id = other_user_id then
    return false;
  end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = caller_id and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = caller_id)
  ) then
    return false;
  end if;

  select coalesce(p.is_premium = true and (p.premium_until is null or p.premium_until > now()), false)
  into premium_active
  from public.profiles p
  where p.id = caller_id;

  if coalesce(premium_active, false) then
    return true;
  end if;

  return exists (
    select 1
    from public.cheers reverse_cheers
    where reverse_cheers.sender_id = caller_id
      and reverse_cheers.receiver_id = other_user_id
  );
end;
$$;

revoke all on function private.can_reveal_received_cheers(uuid) from public, anon;
grant execute on function private.can_reveal_received_cheers(uuid) to authenticated, service_role;

drop policy if exists "Users can read related cheers" on public.cheers;

create policy "Users can read privacy-safe cheers"
on public.cheers
for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (
    (select auth.uid()) = receiver_id
    and private.can_reveal_received_cheers(sender_id)
  )
);
