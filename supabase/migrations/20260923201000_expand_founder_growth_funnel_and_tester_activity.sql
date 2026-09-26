create or replace function public.get_admin_growth_funnel()
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
    'installs_total', (select count(*) from public.app_installations),
    'installs_24h', (select count(*) from public.app_installations where created_at >= now() - interval '24 hours'),
    'installs_7d', (select count(*) from public.app_installations where created_at >= now() - interval '7 days'),
    'registered', (select count(*) from public.profiles),
    'registered_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'active_24h', (select count(*) from public.profiles where last_seen_at >= now() - interval '24 hours'),
    'active_7d', (select count(*) from public.profiles where last_seen_at >= now() - interval '7 days'),
    'cheers_users', (select count(distinct user_id) from (select sender_id as user_id from public.cheers union select receiver_id as user_id from public.cheers) u),
    'cheers_users_7d', (select count(distinct user_id) from (select sender_id as user_id from public.cheers where created_at >= now() - interval '7 days' union select receiver_id as user_id from public.cheers where created_at >= now() - interval '7 days') u),
    'chat_users', (select count(distinct sender_id) from public.messages),
    'chat_users_7d', (select count(distinct sender_id) from public.messages where created_at >= now() - interval '7 days'),
    'premium_active', (select count(*) from public.profiles where is_premium = true and (premium_until is null or premium_until > now())),
    'waitlist_total', (select count(*) from public.waitlist),
    'waitlist_confirmed', (select count(*) from public.waitlist where confirmed_at is not null),
    'app_registered', (select count(*) from public.waitlist where app_registered_at is not null),
    'app_profiles', (select count(*) from public.profiles),
    'referred_profiles', (select count(*) from public.profiles where referred_by_code is not null),
    'attributed_profiles', (select count(*) from public.profiles where attribution_source is not null),
    'generated_at', now()
  ) into result;

  return result;
end;
$function$;

revoke all on function public.get_admin_growth_funnel() from public, anon;
grant execute on function public.get_admin_growth_funnel() to authenticated;

create or replace function public.get_admin_tester_activity()
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

  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_seen_at desc nulls last, x.created_at desc), '[]'::jsonb)
  into result
  from (
    select
      p.id,
      p.name,
      p.city,
      p.preferred_language,
      p.created_at,
      p.last_seen_at,
      p.is_active,
      p.active_until,
      (p.is_premium = true and (p.premium_until is null or p.premium_until > now())) as premium_active,
      (select count(*) from public.cheers c where c.sender_id = p.id) as cheers_sent,
      (select count(*) from public.cheers c where c.receiver_id = p.id) as cheers_received,
      (select count(*) from public.messages m where m.sender_id = p.id) as messages_sent,
      (select count(*) from public.conversations c where c.user_one = p.id or c.user_two = p.id) as conversations,
      (select max(m.created_at) from public.messages m where m.sender_id = p.id) as last_message_at,
      (select max(c.created_at) from public.cheers c where c.sender_id = p.id or c.receiver_id = p.id) as last_cheers_at
    from public.profiles p
    order by p.last_seen_at desc nulls last, p.created_at desc
    limit 200
  ) x;

  return jsonb_build_object('testers', result, 'generated_at', now());
end;
$function$;

revoke all on function public.get_admin_tester_activity() from public, anon;
grant execute on function public.get_admin_tester_activity() to authenticated;
