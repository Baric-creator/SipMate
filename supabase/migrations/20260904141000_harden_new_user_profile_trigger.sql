create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parsed_age integer;
  raw_age text;
begin
  raw_age := new.raw_user_meta_data->>'age';

  if raw_age is not null and raw_age ~ '^[0-9]{1,3}$' then
    parsed_age := raw_age::integer;
  else
    parsed_age := null;
  end if;

  insert into public.profiles (
    id,
    name,
    age,
    bio,
    currently_up_for,
    is_active
  )
  values (
    new.id,
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    parsed_age,
    '',
    '🍺 Beer',
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
