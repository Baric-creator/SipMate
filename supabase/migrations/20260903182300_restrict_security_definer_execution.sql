-- Applied to production on 2026-09-03.
revoke execute on function public.enforce_profile_photo_limit() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_premium_subscription_change() from public, anon, authenticated;
revoke execute on function public.refresh_premium_offer_counts() from public, anon, authenticated;
revoke execute on function public.trigger_refresh_premium_offer_counts() from public, anon, authenticated;
revoke execute on function public.update_premium_offer_stage() from public, anon, authenticated;
revoke execute on function public.is_blocked_between(uuid,uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid,uuid) to authenticated;
