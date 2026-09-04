-- Add storage paths to privacy-preserving profile RPCs so clients can resolve
-- private avatar/gallery objects without relying on legacy public URLs.

create or replace function public.get_public_profile(target_user_id uuid)
returns table (
  id uuid,
  name text,
  age integer,
  city text,
  bio text,
  currently_up_for text,
  is_active boolean,
  avatar_url text,
  avatar_path text,
  gender text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.id, p.name, p.age, p.city, p.bio, p.currently_up_for, p.is_active,
         p.avatar_url, p.avatar_path, p.gender
  from public.profiles p
  where p.id = target_user_id
    and auth.uid() is not null
    and (p.id = auth.uid() or not public.is_blocked_between(auth.uid(), p.id))
  limit 1;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

create or replace function public.get_nearby_profiles(
  max_distance_km double precision default 10,
  custom_origin_latitude double precision default null,
  custom_origin_longitude double precision default null
)
returns table (
  id uuid,
  name text,
  age integer,
  city text,
  bio text,
  currently_up_for text,
  is_active boolean,
  avatar_url text,
  avatar_path text,
  gender text,
  distance_km double precision
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with me as (
    select p.id, p.latitude, p.longitude,
      (p.is_premium = true and (p.premium_until is null or p.premium_until > now())) as premium_active
    from public.profiles p
    where p.id = auth.uid()
  ), origin as (
    select
      case when premium_active and custom_origin_latitude between -90 and 90 then custom_origin_latitude else latitude end as lat,
      case when premium_active and custom_origin_longitude between -180 and 180 then custom_origin_longitude else longitude end as lon
    from me
  ), candidates as (
    select p.id, p.name, p.age, p.city, p.bio, p.currently_up_for, p.is_active,
      p.avatar_url, p.avatar_path, p.gender,
      6371.0 * acos(least(1.0, greatest(-1.0,
        cos(radians(o.lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(o.lon)) +
        sin(radians(o.lat)) * sin(radians(p.latitude))
      ))) as distance_km
    from public.profiles p
    cross join origin o
    where auth.uid() is not null
      and o.lat is not null and o.lon is not null
      and p.id <> auth.uid()
      and p.is_active = true
      and p.latitude is not null and p.longitude is not null
      and not public.is_blocked_between(auth.uid(), p.id)
      and not exists (
        select 1 from public.skipped_profiles s
        where s.user_id = auth.uid() and s.skipped_user_id = p.id
      )
  )
  select c.id, c.name, c.age, c.city, c.bio, c.currently_up_for, c.is_active,
         c.avatar_url, c.avatar_path, c.gender, c.distance_km
  from candidates c
  where c.distance_km <= least(greatest(coalesce(max_distance_km, 10), 1), 100)
  order by c.distance_km asc;
$$;

revoke all on function public.get_nearby_profiles(double precision,double precision,double precision) from public, anon;
grant execute on function public.get_nearby_profiles(double precision,double precision,double precision) to authenticated;
