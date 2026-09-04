alter table public.reports add constraint reports_details_length check(details is null or length(details)<=1000);

create or replace function private.set_reporter_id() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','service_role') then return new; end if;
 new.reporter_id:=(select auth.uid());
 new.status:='pending';
 return new;
end $$;
revoke all on function private.set_reporter_id() from public,anon,authenticated;
grant execute on function private.set_reporter_id() to service_role;
create trigger reports_set_reporter before insert on public.reports for each row execute function private.set_reporter_id();
revoke insert on table public.reports from authenticated;
grant insert(reporter_id,reported_id,reason,details) on table public.reports to authenticated;
revoke update on table public.reports from authenticated;
