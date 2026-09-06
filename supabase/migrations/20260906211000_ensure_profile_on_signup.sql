create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
    case
      when (new.raw_user_meta_data->>'age') ~ '^[0-9]+$'
        then (new.raw_user_meta_data->>'age')::integer
      else null
    end,
    false,
    false,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (id, name, age, is_active, is_premium, created_at)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data->>'name', '')), ''),
  case
    when (u.raw_user_meta_data->>'age') ~ '^[0-9]+$'
      then (u.raw_user_meta_data->>'age')::integer
    else null
  end,
  false,
  false,
  coalesce(u.created_at, now())
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
