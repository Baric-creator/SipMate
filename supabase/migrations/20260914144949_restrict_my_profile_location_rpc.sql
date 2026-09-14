revoke all on function public.get_my_profile_location() from public;
revoke all on function public.get_my_profile_location() from anon;
grant execute on function public.get_my_profile_location() to authenticated;
