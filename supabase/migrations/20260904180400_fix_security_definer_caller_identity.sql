create or replace function private.enforce_social_action_quota()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  ok boolean;
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    return new;
  end if;

  if tg_table_name = 'cheers' then
    ok := private.consume_action_quota('cheers', 60, 3600);
  elsif tg_table_name = 'messages' then
    ok := private.consume_action_quota('message', 120, 60);
  elsif tg_table_name = 'reports' then
    ok := private.consume_action_quota('report', 20, 86400);
  else
    raise exception 'unsupported rate limited table';
  end if;

  if not ok then
    raise exception 'rate limit exceeded for %', tg_table_name using errcode = 'P0001';
  end if;

  return new;
end
$$;

create or replace function private.set_reporter_id()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    return new;
  end if;

  new.reporter_id := v_user;
  new.status := 'pending';
  return new;
end
$$;

revoke execute on function private.enforce_social_action_quota() from public, anon, authenticated;
revoke execute on function private.set_reporter_id() from public, anon, authenticated;
grant execute on function private.enforce_social_action_quota() to service_role;
grant execute on function private.set_reporter_id() to service_role;
