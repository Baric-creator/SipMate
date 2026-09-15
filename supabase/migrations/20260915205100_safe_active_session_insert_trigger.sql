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
    if tg_op = 'INSERT' then
      new.active_until := now() + interval '3 hours';
    elsif old.is_active is distinct from true
      or old.active_until is null
      or old.active_until <= now()
    then
      new.active_until := now() + interval '3 hours';
    else
      new.active_until := least(coalesce(new.active_until, old.active_until), old.active_until);
    end if;
    new.last_seen_at := now();
  else
    new.active_until := null;
    new.last_seen_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_active_session_window() from public;
