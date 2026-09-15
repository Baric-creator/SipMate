-- SipMate is 18+. Keep the database rule aligned with the registration UI even
-- when profile rows are written outside the React screen. NOT VALID avoids
-- blocking deployment on historical/test rows while still enforcing future writes.

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'profiles_age_adult_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_age_adult_check
      check (age is null or (age >= 18 and age <= 120))
      not valid;
  end if;
end
$$;
