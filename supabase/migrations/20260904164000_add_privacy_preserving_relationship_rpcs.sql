create or replace function public.get_blocked_users()
returns table (
  id uuid,
  name text,
  age integer,
  city text,
  avatar_url text,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.age, p.city, p.avatar_url, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
    and auth.uid() is not null
  order by b.created_at desc;
$$;

revoke all on function public.get_blocked_users() from public, anon;
grant execute on function public.get_blocked_users() to authenticated, service_role;

create or replace function public.get_skipped_profile_summaries()
returns table (
  id uuid,
  name text,
  age integer,
  avatar_url text,
  currently_up_for text,
  gender text,
  skipped_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.age, p.avatar_url, p.currently_up_for, p.gender, s.created_at
  from public.skipped_profiles s
  join public.profiles p on p.id = s.skipped_user_id
  where s.user_id = auth.uid()
    and auth.uid() is not null
    and not public.is_blocked_between(auth.uid(), p.id)
  order by s.created_at desc;
$$;

revoke all on function public.get_skipped_profile_summaries() from public, anon;
grant execute on function public.get_skipped_profile_summaries() to authenticated, service_role;

create or replace function public.get_chat_list()
returns table (
  conversation_id uuid,
  user_id uuid,
  name text,
  age integer,
  is_active boolean,
  avatar_url text,
  last_message text,
  last_message_time timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select
      c.id as conversation_id,
      case when c.user_one = auth.uid() then c.user_two else c.user_one end as other_user_id
    from public.conversations c
    where auth.uid() is not null
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
  )
  select
    m.conversation_id,
    p.id,
    p.name,
    p.age,
    coalesce(p.is_active, false),
    p.avatar_url,
    lm.content,
    lm.created_at,
    coalesce(uc.unread_count, 0)
  from mine m
  join public.profiles p on p.id = m.other_user_id
  left join lateral (
    select msg.content, msg.created_at
    from public.messages msg
    where msg.conversation_id = m.conversation_id
    order by msg.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*)::bigint as unread_count
    from public.messages msg
    where msg.conversation_id = m.conversation_id
      and msg.sender_id <> auth.uid()
      and msg.read_at is null
  ) uc on true
  where not public.is_blocked_between(auth.uid(), p.id)
  order by lm.created_at desc nulls last, m.conversation_id;
$$;

revoke all on function public.get_chat_list() from public, anon;
grant execute on function public.get_chat_list() to authenticated, service_role;
