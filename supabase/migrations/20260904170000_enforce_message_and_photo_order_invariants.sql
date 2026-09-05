alter table public.messages
  add constraint messages_content_not_blank check (btrim(content) <> '');

alter table public.profile_photos
  add constraint profile_photos_sort_order_nonnegative check (sort_order is null or sort_order >= 0);

-- Consolidated from 20260904170000_hide_incoming_blocks_and_harden_block_check.sql because Supabase migration versions are keyed by timestamp.
create or replace function public.is_blocked_between(user_a uuid, user_b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if user_a is null or user_b is null then
    return false;
  end if;

  if caller_id <> user_a and caller_id <> user_b then
    raise exception 'Block relationship check must involve the authenticated user';
  end if;

  return exists (
    select 1
    from public.blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
end;
$$;

revoke all on function public.is_blocked_between(uuid, uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

drop policy if exists "Users can view related blocks" on public.blocks;
create policy "Users can view own created blocks"
on public.blocks
for select
to authenticated
using ((select auth.uid()) = blocker_id);
