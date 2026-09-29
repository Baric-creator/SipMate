drop policy if exists "Authenticated users can view unblocked profile photos" on public.profile_photos;

create policy "Premium users can view unblocked profile photos"
on public.profile_photos
for select
to authenticated
using (
  user_id = auth.uid()
  or (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.is_premium = true
        and (me.premium_until is null or me.premium_until > now())
    )
    and not public.is_blocked_between(auth.uid(), user_id)
  )
);
