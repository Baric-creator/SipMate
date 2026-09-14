create index if not exists profiles_active_until_idx
  on public.profiles (active_until)
  where is_active = true and active_until is not null;
