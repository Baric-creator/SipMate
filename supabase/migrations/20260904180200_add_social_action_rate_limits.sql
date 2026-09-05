create table public.user_action_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check(action in ('cheers','message','report')),
 window_start timestamptz not null,
 action_count integer not null default 0 check(action_count>=0),
 primary key(user_id,action)
);
alter table public.user_action_rate_limits enable row level security;
revoke all on table public.user_action_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on table public.user_action_rate_limits to service_role;
create index user_action_rate_limits_window_start_idx on public.user_action_rate_limits(window_start);

create or replace function private.consume_action_quota(p_action text,p_limit integer,p_window_seconds integer) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_user uuid:=(select auth.uid()); v_row public.user_action_rate_limits%rowtype; v_now timestamptz:=now();
begin
 if v_user is null then return false; end if;
 if p_action not in ('cheers','message','report') or p_limit<1 or p_window_seconds<1 then raise exception 'invalid quota configuration'; end if;
 insert into public.user_action_rate_limits(user_id,action,window_start,action_count) values(v_user,p_action,v_now,1) on conflict(user_id,action) do nothing;
 if found then return true; end if;
 select * into v_row from public.user_action_rate_limits where user_id=v_user and action=p_action for update;
 if v_row.window_start<=v_now-make_interval(secs=>p_window_seconds) then update public.user_action_rate_limits set window_start=v_now,action_count=1 where user_id=v_user and action=p_action; return true; end if;
 if v_row.action_count>=p_limit then return false; end if;
 update public.user_action_rate_limits set action_count=action_count+1 where user_id=v_user and action=p_action; return true;
end $$;

create or replace function private.enforce_social_action_quota() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare ok boolean;
begin
 if current_user in ('postgres','service_role') then return new; end if;
 if tg_table_name='cheers' then ok:=private.consume_action_quota('cheers',60,3600);
 elsif tg_table_name='messages' then ok:=private.consume_action_quota('message',120,60);
 elsif tg_table_name='reports' then ok:=private.consume_action_quota('report',20,86400);
 else raise exception 'unsupported rate limited table'; end if;
 if not ok then raise exception 'rate limit exceeded for %',tg_table_name using errcode='P0001'; end if;
 return new;
end $$;
revoke all on function private.consume_action_quota(text,integer,integer) from public,anon,authenticated;
revoke all on function private.enforce_social_action_quota() from public,anon,authenticated;
grant execute on function private.consume_action_quota(text,integer,integer) to service_role;
grant execute on function private.enforce_social_action_quota() to service_role;
create trigger cheers_rate_limit before insert on public.cheers for each row execute function private.enforce_social_action_quota();
create trigger messages_rate_limit before insert on public.messages for each row execute function private.enforce_social_action_quota();
create trigger reports_rate_limit before insert on public.reports for each row execute function private.enforce_social_action_quota();
