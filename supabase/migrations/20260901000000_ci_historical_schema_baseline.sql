-- Sanitized structural baseline for the SipMate schema that predates committed hardening migrations.
-- CI/recovery only: no production data is represented here.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age integer,
  bio text,
  currently_up_for text,
  is_active boolean default true,
  city text,
  latitude double precision,
  longitude double precision,
  avatar_url text,
  created_at timestamptz default now(),
  is_premium boolean not null default false,
  premium_until timestamptz,
  gender text
);
create table if not exists public.cheers (id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade, receiver_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz default now(), unique(sender_id,receiver_id));
create table if not exists public.conversations (id uuid primary key default gen_random_uuid(), user_one uuid not null references public.profiles(id) on delete cascade, user_two uuid not null references public.profiles(id) on delete cascade, created_at timestamptz default now());
create table if not exists public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade, sender_id uuid not null references public.profiles(id) on delete cascade, content text not null, created_at timestamptz default now(), read_at timestamptz);
create table if not exists public.blocks (id uuid primary key default gen_random_uuid(), blocker_id uuid not null references public.profiles(id) on delete cascade, blocked_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(blocker_id,blocked_id));
create table if not exists public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade, reported_id uuid not null references public.profiles(id) on delete cascade, reason text not null, details text, status text not null default 'pending', created_at timestamptz not null default now());
create table if not exists public.premium_offers (id uuid primary key default gen_random_uuid(), code text not null unique, name text not null, price_cents integer not null, billing_period text not null, max_subscribers integer, subscriber_count integer not null default 0, is_active boolean not null default true, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.premium_subscriptions (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, offer_code text not null, status text not null default 'active', started_at timestamptz not null default now(), expires_at timestamptz, created_at timestamptz not null default now(), stripe_subscription_id text, stripe_customer_id text, stripe_price_id text, cancel_at_period_end boolean not null default false);
create table if not exists public.profile_photos (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, photo_url text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists public.skipped_profiles (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, skipped_user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id,skipped_user_id));

-- Historical function signatures referenced by the first committed permission-hardening migration.
-- Later migrations replace/harden these definitions; these stubs exist only so clean replay can reach them.
create or replace function public.enforce_profile_photo_limit() returns trigger language plpgsql security definer as 'begin return new; end';
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as 'begin return new; end';
create or replace function public.handle_premium_subscription_change() returns trigger language plpgsql security definer as 'begin return coalesce(new,old); end';
create or replace function public.refresh_premium_offer_counts() returns void language plpgsql security definer as 'begin return; end';
create or replace function public.trigger_refresh_premium_offer_counts() returns trigger language plpgsql security definer as 'begin return coalesce(new,old); end';
create or replace function public.update_premium_offer_stage() returns void language plpgsql security definer as 'begin return; end';
create or replace function public.is_blocked_between(user_a uuid, user_b uuid) returns boolean language sql stable as 'select exists(select 1 from public.blocks where (blocker_id=user_a and blocked_id=user_b) or (blocker_id=user_b and blocked_id=user_a))';
create or replace function public.activate_standard_yearly_price() returns void language plpgsql security definer as 'begin return; end';
create or replace function public.register_yearly_premium_purchase() returns void language plpgsql security definer as 'begin return; end';


-- Historical RLS policies referenced by early optimization migrations.
create policy "Users can insert own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can view profiles"
on public.profiles for select to authenticated
using (true);

create policy "Users can create their own blocks"
on public.blocks for insert to authenticated
with check (auth.uid() = blocker_id and blocker_id <> blocked_id);

create policy "Users can delete their own blocks"
on public.blocks for delete to authenticated
using (auth.uid() = blocker_id);

create policy "Users can view related blocks"
on public.blocks for select to authenticated
using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "Users can delete own sent cheers"
on public.cheers for delete to authenticated
using (auth.uid() = sender_id);

create policy "Users can read related cheers"
on public.cheers for select to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send unblocked cheers"
on public.cheers for insert to authenticated
with check (
  auth.uid() = sender_id
  and sender_id <> receiver_id
  and not public.is_blocked_between(sender_id, receiver_id)
);

create policy "Users can create unblocked own conversations"
on public.conversations for insert to authenticated
with check (
  (auth.uid() = user_one or auth.uid() = user_two)
  and user_one <> user_two
  and not public.is_blocked_between(user_one, user_two)
);

create policy "Users can read own conversations"
on public.conversations for select to authenticated
using (auth.uid() = user_one or auth.uid() = user_two);

create policy "Users can view own premium subscription"
on public.premium_subscriptions for select to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view profile photos"
on public.profile_photos for select to authenticated
using (true);

create policy "Users can add own profile photos"
on public.profile_photos for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete own profile photos"
on public.profile_photos for delete to authenticated
using (auth.uid() = user_id);

create policy "Users can update own profile photos"
on public.profile_photos for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can create reports"
on public.reports for insert to authenticated
with check (auth.uid() = reporter_id and reporter_id <> reported_id);

create policy "Users can view their own reports"
on public.reports for select to authenticated
using (auth.uid() = reporter_id);

create policy "Users can add own skipped profiles"
on public.skipped_profiles for insert to authenticated
with check (auth.uid() = user_id and user_id <> skipped_user_id);

create policy "Users can remove own skipped profiles"
on public.skipped_profiles for delete to authenticated
using (auth.uid() = user_id);

create policy "Users can view own skipped profiles"
on public.skipped_profiles for select to authenticated
using (auth.uid() = user_id);

create policy "Users can read messages from own conversations"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
  )
);

create policy "Participants can mark messages as read"
on public.messages for update to authenticated
using (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
  )
)
with check (
  sender_id <> auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
  )
);

create policy "Users can send messages in unblocked own conversations"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.user_one = auth.uid() or c.user_two = auth.uid())
      and not public.is_blocked_between(c.user_one, c.user_two)
  )
);
