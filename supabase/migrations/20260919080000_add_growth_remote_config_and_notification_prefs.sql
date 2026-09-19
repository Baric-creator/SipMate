
alter table public.profiles
  add column if not exists invite_code text,
  add column if not exists referred_by_code text,
  add column if not exists attribution_source text,
  add column if not exists notify_messages boolean not null default true,
  add column if not exists notify_cheers boolean not null default true,
  add column if not exists notify_photos boolean not null default true,
  add column if not exists notify_marketing boolean not null default false;

update public.profiles
set invite_code = 'SM' || upper(substr(replace(id::text, '-', ''), 1, 16))
where invite_code is null;

alter table public.profiles
  alter column invite_code set not null;

create unique index if not exists profiles_invite_code_key
  on public.profiles (invite_code);

alter table public.waitlist
  add column if not exists app_registered_at timestamptz,
  add column if not exists app_user_id uuid;

create index if not exists waitlist_app_user_id_idx
  on public.waitlist (app_user_id);

alter table public.launch_config
  add column if not exists maintenance_mode boolean not null default false,
  add column if not exists min_android_version_code integer not null default 1,
  add column if not exists feature_flags jsonb not null default '{"premium":true,"verified_photos":true,"discord":true,"nearby":true,"founders_offer":true}'::jsonb;

alter table public.launch_config
  drop constraint if exists launch_config_min_android_version_code_check;

alter table public.launch_config
  add constraint launch_config_min_android_version_code_check
  check (min_android_version_code >= 1 and min_android_version_code <= 1000000);

create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  screen text,
  app_version text,
  platform text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.client_events enable row level security;

drop policy if exists client_events_insert_own on public.client_events;
create policy client_events_insert_own
on public.client_events
for insert
to authenticated
with check (user_id = auth.uid());

revoke all on table public.client_events from anon;
revoke select, update, delete on table public.client_events from authenticated;
grant insert (user_id,event_type,screen,app_version,platform,metadata) on table public.client_events to authenticated;

grant update (
  notify_messages,
  notify_cheers,
  notify_photos,
  notify_marketing
) on table public.profiles to authenticated;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  profile_age integer;
  referral text;
  attribution text;
  generated_invite text;
begin
  if coalesce(new.raw_user_meta_data->>'age', '') !~ '^[0-9]{1,3}$' then
    raise exception 'A valid adult age is required';
  end if;

  profile_age := (new.raw_user_meta_data->>'age')::integer;
  if profile_age < 18 or profile_age > 120 then
    raise exception 'SipMate accounts require an age between 18 and 120';
  end if;

  referral := upper(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'referral_code', '')));
  if referral !~ '^[A-Z0-9_-]{3,32}$' then
    referral := null;
  end if;

  attribution := lower(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'attribution_source', '')));
  if attribution !~ '^[a-z0-9._-]{1,80}$' then
    attribution := null;
  end if;

  generated_invite := 'SM' || upper(substr(replace(new.id::text, '-', ''), 1, 16));

  insert into public.profiles (
    id,
    name,
    age,
    is_active,
    is_premium,
    invite_code,
    referred_by_code,
    attribution_source,
    created_at
  )
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
    profile_age,
    false,
    false,
    generated_invite,
    referral,
    attribution,
    now()
  )
  on conflict (id) do nothing;

  if new.email is not null then
    update public.waitlist
    set app_registered_at = coalesce(app_registered_at, now()),
        app_user_id = coalesce(app_user_id, new.id)
    where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public;
revoke all on function public.handle_new_user_profile() from anon;
revoke all on function public.handle_new_user_profile() from authenticated;
