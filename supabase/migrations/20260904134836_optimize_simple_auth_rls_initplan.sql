alter policy "Users can create their own blocks" on public.blocks
  with check (((select auth.uid()) = blocker_id) and (blocker_id <> blocked_id));
alter policy "Users can delete their own blocks" on public.blocks
  using ((select auth.uid()) = blocker_id);
alter policy "Users can view related blocks" on public.blocks
  using (((select auth.uid()) = blocker_id) or ((select auth.uid()) = blocked_id));
alter policy "Users can delete own sent cheers" on public.cheers
  using ((select auth.uid()) = sender_id);
alter policy "Users can read related cheers" on public.cheers
  using (((select auth.uid()) = sender_id) or ((select auth.uid()) = receiver_id));
alter policy "Users can send unblocked cheers" on public.cheers
  with check (((select auth.uid()) = sender_id) and (sender_id <> receiver_id) and (not is_blocked_between(sender_id, receiver_id)));
alter policy "Users can create unblocked own conversations" on public.conversations
  with check ((((select auth.uid()) = user_one) or ((select auth.uid()) = user_two)) and (user_one <> user_two) and (not is_blocked_between(user_one, user_two)));
alter policy "Users can read own conversations" on public.conversations
  using (((select auth.uid()) = user_one) or ((select auth.uid()) = user_two));
alter policy "Users can view own premium subscription" on public.premium_subscriptions
  using ((select auth.uid()) = user_id);
alter policy "Users can add own profile photos" on public.profile_photos
  with check ((select auth.uid()) = user_id);
alter policy "Users can delete own profile photos" on public.profile_photos
  using ((select auth.uid()) = user_id);
alter policy "Users can update own profile photos" on public.profile_photos
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "Users can create reports" on public.reports
  with check (((select auth.uid()) = reporter_id) and (reporter_id <> reported_id));
alter policy "Users can view their own reports" on public.reports
  using ((select auth.uid()) = reporter_id);
alter policy "Users can add own skipped profiles" on public.skipped_profiles
  with check (((select auth.uid()) = user_id) and (user_id <> skipped_user_id));
alter policy "Users can remove own skipped profiles" on public.skipped_profiles
  using ((select auth.uid()) = user_id);
alter policy "Users can view own skipped profiles" on public.skipped_profiles
  using ((select auth.uid()) = user_id);
