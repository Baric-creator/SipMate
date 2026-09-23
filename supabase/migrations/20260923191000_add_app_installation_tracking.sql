create table if not exists public.app_installations (
  installation_id text primary key,
  platform text not null check (platform in ('android','ios')),
  app_version text not null default 'unknown',
  created_at timestamptz not null default now()
);

alter table public.app_installations enable row level security;

grant insert on table public.app_installations to anon, authenticated;
revoke select, update, delete on table public.app_installations from anon, authenticated;

drop policy if exists "app can register installation" on public.app_installations;
create policy "app can register installation"
on public.app_installations
for insert
to anon, authenticated
with check (
  char_length(installation_id) between 16 and 100
  and platform in ('android','ios')
  and char_length(app_version) between 1 and 30
);

create or replace function public.get_admin_app_health()
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
    'app_installs', (select count(*) from public.app_installations),
    'app_installs_24h', (select count(*) from public.app_installations where created_at >= now() - interval '24 hours'),
    'app_installs_7d', (select count(*) from public.app_installations where created_at >= now() - interval '7 days'),
    'active_users_24h', (select count(*) from public.profiles where last_seen_at >= now() - interval '24 hours'),
    'active_users_7d', (select count(*) from public.profiles where last_seen_at >= now() - interval '7 days'),
    'messages_24h', (select count(*) from public.messages where created_at >= now() - interval '24 hours'),
    'cheers_24h', (select count(*) from public.cheers where created_at >= now() - interval '24 hours'),
    'mutual_pairs_24h', (
      select count(*) from (
        select least(c.sender_id,c.receiver_id), greatest(c.sender_id,c.receiver_id)
        from public.cheers c
        where c.created_at >= now() - interval '24 hours'
          and exists (
            select 1 from public.cheers r
            where r.sender_id=c.receiver_id and r.receiver_id=c.sender_id
          )
        group by 1,2
      ) q
    ),
    'push_tokens', (select count(*) from public.device_push_tokens),
    'client_errors_24h', (select count(*) from public.client_events where created_at >= now() - interval '24 hours' and event_type in ('js_error','unhandled_rejection')),
    'verification_failures_24h', (select count(*) from public.chat_image_safety_events where created_at >= now() - interval '24 hours' and outcome='verification_failed'),
    'pending_reports', (select count(*) from public.reports where status='pending'),
    'profiles_total', (select count(*) from public.profiles),
    'premium_active', (select count(*) from public.profiles where is_premium=true and (premium_until is null or premium_until > now())),
    'generated_at', now()
  ) into result;

  return result;
end;
$function$;

revoke all on function public.get_admin_app_health() from public, anon;
grant execute on function public.get_admin_app_health() to authenticated;
