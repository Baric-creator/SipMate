create or replace function public.get_cheers_overview()
returns table (
  cheers_id uuid,
  user_id uuid,
  name text,
  age integer,
  status text,
  identity_revealed boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with me as (
    select
      p.id,
      (p.is_premium = true and (p.premium_until is null or p.premium_until > now())) as premium_active
    from public.profiles p
    where p.id = auth.uid()
  ), sent as (
    select c.id, c.receiver_id as other_id, c.created_at
    from public.cheers c
    where c.sender_id = auth.uid()
  ), received as (
    select c.id, c.sender_id as other_id, c.created_at
    from public.cheers c
    where c.receiver_id = auth.uid()
  ), combined as (
    select
      coalesce(s.id, r.id) as cheers_id,
      coalesce(s.other_id, r.other_id) as other_id,
      greatest(coalesce(s.created_at, '-infinity'::timestamptz), coalesce(r.created_at, '-infinity'::timestamptz)) as created_at,
      (s.id is not null) as i_sent,
      (r.id is not null) as i_received
    from sent s
    full outer join received r on r.other_id = s.other_id
  )
  select
    c.cheers_id,
    case when c.i_sent or c.i_received and (select premium_active from me) then p.id else null end as user_id,
    case when c.i_sent or c.i_received and (select premium_active from me) then p.name else null end as name,
    case when c.i_sent or c.i_received and (select premium_active from me) then p.age else null end as age,
    case
      when c.i_sent and c.i_received then 'Mutual Cheers'
      when c.i_sent then 'Sent'
      else 'Received'
    end as status,
    (c.i_sent or (c.i_received and (select premium_active from me))) as identity_revealed,
    c.created_at
  from combined c
  join public.profiles p on p.id = c.other_id
  where auth.uid() is not null
    and not public.is_blocked_between(auth.uid(), p.id)
  order by
    case when c.i_sent and c.i_received then 0 when c.i_received then 1 else 2 end,
    c.created_at desc;
$$;

revoke all on function public.get_cheers_overview() from public, anon;
grant execute on function public.get_cheers_overview() to authenticated;
