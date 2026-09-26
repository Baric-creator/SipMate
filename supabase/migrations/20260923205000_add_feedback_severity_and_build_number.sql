alter table public.app_feedback
  add column if not exists severity text not null default 'p2',
  add column if not exists build_number text not null default 'unknown';

alter table public.app_feedback
  drop constraint if exists app_feedback_severity_check;

alter table public.app_feedback
  add constraint app_feedback_severity_check check (severity in ('p0','p1','p2','p3'));

create index if not exists app_feedback_severity_status_idx on public.app_feedback(severity,status,created_at desc);

create or replace function public.get_admin_app_feedback()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  caller_email text := lower(coalesce(auth.jwt()->>'email', ''));
  result jsonb;
begin
  if auth.uid() is null or caller_email <> 'sipmate.app@gmail.com' then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'new', (select count(*) from public.app_feedback where status='new'),
      'reviewed', (select count(*) from public.app_feedback where status='reviewed'),
      'resolved', (select count(*) from public.app_feedback where status='resolved'),
      'p0', (select count(*) from public.app_feedback where severity='p0' and status<>'resolved'),
      'p1', (select count(*) from public.app_feedback where severity='p1' and status<>'resolved'),
      'p2', (select count(*) from public.app_feedback where severity='p2' and status<>'resolved'),
      'p3', (select count(*) from public.app_feedback where severity='p3' and status<>'resolved')
    ),
    'feedback', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select f.id,f.category,f.details,f.screen,f.app_version,f.build_number,f.platform,f.status,f.severity,f.created_at,f.reviewed_at,
               p.name,p.city
        from public.app_feedback f
        left join public.profiles p on p.id=f.user_id
        order by f.created_at desc
        limit 200
      ) x
    ), '[]'::jsonb),
    'generated_at', now()
  ) into result;
  return result;
end;
$function$;

create or replace function public.set_admin_app_feedback_triage(p_feedback_id uuid, p_status text, p_severity text)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  caller_email text := lower(coalesce(auth.jwt()->>'email', ''));
  updated public.app_feedback;
begin
  if auth.uid() is null or caller_email <> 'sipmate.app@gmail.com' then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('new','reviewed','resolved') then
    raise exception 'Invalid status';
  end if;
  if p_severity not in ('p0','p1','p2','p3') then
    raise exception 'Invalid severity';
  end if;

  update public.app_feedback
  set status = p_status,
      severity = p_severity,
      reviewed_at = case when p_status='new' then null else now() end
  where id = p_feedback_id
  returning * into updated;

  if updated.id is null then
    raise exception 'Feedback not found';
  end if;

  return jsonb_build_object('ok', true, 'id', updated.id, 'status', updated.status, 'severity', updated.severity, 'reviewed_at', updated.reviewed_at);
end;
$function$;

revoke all on function public.set_admin_app_feedback_triage(uuid,text,text) from public, anon;
grant execute on function public.set_admin_app_feedback_triage(uuid,text,text) to authenticated;
