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
  gender text,
  distance_km double precision
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  origin_lat double precision;
  origin_lon double precision;
  caller_premium boolean := false;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if max_distance_km is null or max_distance_km <= 0 or max_distance_km > 100 then raise exception 'max_distance_km must be between 0 and 100'; end if;
  if (custom_origin_latitude is null) <> (custom_origin_longitude is null) then raise exception 'Custom latitude and longitude must be supplied together'; end if;
  if custom_origin_latitude is not null and (custom_origin_latitude < -90 or custom_origin_latitude > 90) then raise exception 'Invalid custom latitude'; end if;
  if custom_origin_longitude is not null and (custom_origin_longitude < -180 or custom_origin_longitude > 180) then raise exception 'Invalid custom longitude'; end if;

  select p.latitude, p.longitude,
    coalesce(p.is_premium = true and (p.premium_until is null or p.premium_until > now()), false)
  into origin_lat, origin_lon, caller_premium
  from public.profiles p where p.id = caller_id;

  if caller_premium and custom_origin_latitude is not null then
    origin_lat := custom_origin_latitude;
    origin_lon := custom_origin_longitude;
  end if;
  if origin_lat is null or origin_lon is null then return; end if;

  return query
  select p.id, p.name, p.age, p.city, p.bio, p.currently_up_for, p.is_active, p.avatar_url, p.gender, d.distance_km
  from public.profiles p
  cross join lateral (
    select 6371.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(p.latitude - origin_lat) / 2.0), 2) +
      cos(radians(origin_lat)) * cos(radians(p.latitude)) *
      power(sin(radians(p.longitude - origin_lon) / 2.0), 2)
    )))) as distance_km
  ) d
  where p.id <> caller_id
    and p.is_active = true
    and p.latitude is not null and p.longitude is not null
    and not public.is_blocked_between(caller_id, p.id)
    and not exists (select 1 from public.skipped_profiles s where s.user_id = caller_id and s.skipped_user_id = p.id)
    and d.distance_km <= max_distance_km
  order by d.distance_km asc;
end;
$$;

revoke all on function public.get_nearby_profiles(double precision,double precision,double precision) from public, anon;
grant execute on function public.get_nearby_profiles(double precision,double precision,double precision) to authenticated, service_role;
