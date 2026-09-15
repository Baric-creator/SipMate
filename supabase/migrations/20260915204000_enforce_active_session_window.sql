-- Keep the three-hour Active contract authoritative at the database boundary.
-- Authenticated clients may toggle their own Active state, but they cannot extend
-- an existing session indefinitely by writing a far-future active_until value.

create or replace function public.enforce_profile_active_session_window()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() <> 'authenticated' then
    return new;
  end if;

  if new.is_active = true then
    if tg_op = 'INSERT'
      or old.is_active is distinct from true
      or old.active_until is null
      or old.active_until <= now()
    then
      new.active_until := now() + interval '3 hours';
    else
      -- Existing Active sessions may be shortened, but never extended by a client.
      new.active_until := least(coalesce(new.active_until, old.active_until), old.active_until);
    end if;

    -- Presence timestamps are server-authored for authenticated profile writes.
    new.last_seen_at := now();
  else
    new.active_until := null;
    new.last_seen_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_active_session_window() from public;

drop trigger if exists enforce_profile_active_session_window on public.profiles;
create trigger enforce_profile_active_session_window
before insert or update of is_active, active_until, last_seen_at on public.profiles
for each row
execute function public.enforce_profile_active_session_window();
