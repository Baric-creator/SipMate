create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug','performance','ui','account','other')),
  details text not null,
  screen text,
  app_version text not null default 'unknown',
  platform text not null default 'unknown',
  status text not null default 'new' check (status in ('new','reviewed','resolved')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.app_feedback enable row level security;

grant insert on table public.app_feedback to authenticated;
revoke select, update, delete on table public.app_feedback from anon, authenticated;

drop policy if exists "users can submit own feedback" on public.app_feedback;
create policy "users can submit own feedback"
on public.app_feedback
for insert
to authenticated
with check (
  auth.uid() = user_id
  and char_length(details) between 10 and 2000
  and category in ('bug','performance','ui','account','other')
  and char_length(coalesce(screen,'')) <= 100
  and char_length(app_version) <= 30
  and char_length(platform) <= 30
);

create index if not exists app_feedback_created_at_idx on public.app_feedback(created_at desc);
create index if not exists app_feedback_status_idx on public.app_feedback(status, created_at desc);

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
      'resolved', (select count(*) from public.app_feedback where status='resolved')
    ),
    'feedback', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select f.id,f.category,f.details,f.screen,f.app_version,f.platform,f.status,f.created_at,f.reviewed_at,
               p.name,p.city
        from public.app_feedback f
        left join public.profiles p on p.id=f.user_id
        order by f.created_at desc
        limit 100
      ) x
    ), '[]'::jsonb),
    'generated_at', now()
  ) into result;
  return result;
end;
$function$;

revoke all on function public.get_admin_app_feedback() from public, anon;
grant execute on function public.get_admin_app_feedback() to authenticated;
