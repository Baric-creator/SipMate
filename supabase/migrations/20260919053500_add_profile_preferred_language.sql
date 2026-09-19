alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

alter table public.profiles
  drop constraint if exists profiles_preferred_language_check;

alter table public.profiles
  add constraint profiles_preferred_language_check
  check (preferred_language = any (array['en'::text,'de'::text,'hr'::text]));

grant insert (preferred_language) on table public.profiles to authenticated;
grant update (preferred_language) on table public.profiles to authenticated;
