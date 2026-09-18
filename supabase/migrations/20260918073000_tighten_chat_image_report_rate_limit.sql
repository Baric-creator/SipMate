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
    if coalesce(new.report_kind, 'profile') = 'chat_image' then
      ok := private.consume_action_quota('chat_image_report', 10, 86400);
    else
      ok := private.consume_action_quota('report', 20, 86400);
    end if;
  else
    raise exception 'unsupported rate limited table';
  end if;

  if not ok then
    raise exception 'rate limit exceeded for %', tg_table_name using errcode = 'P0001';
  end if;

  return new;
end
$$;
