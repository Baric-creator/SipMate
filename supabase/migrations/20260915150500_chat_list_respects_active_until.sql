create or replace function public.get_chat_list()
returns table(
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
set search_path = pg_catalog, public
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
    coalesce(p.is_active, false)
      and p.active_until is not null
      and p.active_until > now()
      and p.last_seen_at is not null
      and p.last_seen_at >= now() - interval '90 seconds',
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

revoke all on function public.get_chat_list() from public;
grant execute on function public.get_chat_list() to authenticated;
