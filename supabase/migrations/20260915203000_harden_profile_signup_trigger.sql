-- Authentication signup must not be able to bypass SipMate's 18+ rule by calling
-- Supabase directly instead of using the React registration screen.

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  profile_age integer;
begin
  if coalesce(new.raw_user_meta_data->>'age', '') !~ '^[0-9]{1,3}$' then
    raise exception 'A valid adult age is required';
  end if;

  profile_age := (new.raw_user_meta_data->>'age')::integer;
  if profile_age < 18 or profile_age > 120 then
    raise exception 'SipMate accounts require an age between 18 and 120';
  end if;

  insert into public.profiles (
    id,
    name,
    age,
    is_active,
    is_premium,
    created_at
  )
  values (
    new.id,
    nullif(pg_catalog.btrim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
    profile_age,
    false,
    false,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public;
revoke all on function public.handle_new_user_profile() from anon;
revoke all on function public.handle_new_user_profile() from authenticated;
