-- Backend-authoritative Premium rewards for giveaways, referrals and manual promotions.
-- App clients cannot read or mutate the ledger and cannot execute the grant function.

create table if not exists public.premium_reward_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  external_reference text not null,
  duration_days integer not null check (duration_days between 1 and 3650),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  constraint premium_reward_grants_source_length_check check (char_length(source) between 1 and 80),
  constraint premium_reward_grants_reference_length_check check (char_length(external_reference) between 1 and 160),
  constraint premium_reward_grants_source_reference_unique unique (source, external_reference)
);

create index if not exists premium_reward_grants_user_id_idx
  on public.premium_reward_grants(user_id, granted_at desc);

alter table public.premium_reward_grants enable row level security;
revoke all on table public.premium_reward_grants from public;
revoke all on table public.premium_reward_grants from anon;
revoke all on table public.premium_reward_grants from authenticated;

create or replace function public.grant_premium_reward(
  p_user_id uuid,
  p_source text,
  p_external_reference text,
  p_duration_days integer default 365,
  p_metadata jsonb default '{}'::jsonb
)
returns table(granted boolean, premium_until timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_source text := pg_catalog.btrim(coalesce(p_source, ''));
  clean_reference text := pg_catalog.btrim(coalesce(p_external_reference, ''));
  current_is_premium boolean;
  current_until timestamptz;
  new_until timestamptz;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if p_user_id is null then raise exception 'user_id required'; end if;
  if char_length(clean_source) < 1 or char_length(clean_source) > 80 then raise exception 'invalid source'; end if;
  if char_length(clean_reference) < 1 or char_length(clean_reference) > 160 then raise exception 'invalid external_reference'; end if;
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 3650 then raise exception 'invalid duration_days'; end if;

  select coalesce(p.is_premium, false), p.premium_until
    into current_is_premium, current_until
  from public.profiles p
  where p.id = p_user_id
  for update;

  if not found then raise exception 'profile_not_found'; end if;

  -- A legacy/lifetime Premium account uses NULL premium_until. Never downgrade it
  -- to a finite promotional entitlement.
  if current_is_premium and current_until is null then
    new_until := null;
  else
    new_until := greatest(coalesce(current_until, now()), now()) + make_interval(days => p_duration_days);
  end if;

  begin
    insert into public.premium_reward_grants (
      user_id, source, external_reference, duration_days, expires_at, metadata
    ) values (
      p_user_id, clean_source, clean_reference, p_duration_days,
      coalesce(new_until, now() + make_interval(days => p_duration_days)),
      coalesce(p_metadata, '{}'::jsonb)
    );
  exception
    when unique_violation then
      return query select false, current_until;
      return;
  end;

  update public.profiles
  set is_premium = true,
      premium_until = new_until
  where id = p_user_id;

  return query select true, new_until;
end;
$$;

revoke all on function public.grant_premium_reward(uuid, text, text, integer, jsonb) from public;
revoke all on function public.grant_premium_reward(uuid, text, text, integer, jsonb) from anon;
revoke all on function public.grant_premium_reward(uuid, text, text, integer, jsonb) from authenticated;
grant execute on function public.grant_premium_reward(uuid, text, text, integer, jsonb) to service_role;
