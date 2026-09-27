create table if not exists public.google_play_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  purchase_token text not null unique,
  product_id text not null,
  base_plan_id text,

  subscription_state text not null,
  expiry_time timestamptz,
  acknowledgement_state text,

  latest_order_id text,
  auto_renew_enabled boolean,

  first_verified_at timestamptz not null default now(),
  last_verified_at timestamptz not null default now(),
  raw_response jsonb not null default '{}'::jsonb,

  constraint google_play_subscriptions_product_check
    check (char_length(product_id) between 1 and 200)
);

create index if not exists google_play_subscriptions_user_idx
  on public.google_play_subscriptions(user_id);

alter table public.google_play_subscriptions enable row level security;

revoke all on table public.google_play_subscriptions from public;
revoke all on table public.google_play_subscriptions from anon;
revoke all on table public.google_play_subscriptions from authenticated;

-- Billing state is backend-only. Mobile clients must never be able to
-- manufacture, alter or delete a Google Play entitlement.

create or replace function public.apply_google_play_premium(
  p_user_id uuid,
  p_purchase_token text,
  p_product_id text,
  p_base_plan_id text,
  p_subscription_state text,
  p_expiry_time timestamptz,
  p_acknowledgement_state text,
  p_latest_order_id text,
  p_auto_renew_enabled boolean,
  p_raw_response jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  if coalesce(pg_catalog.btrim(p_purchase_token), '') = '' then
    raise exception 'purchase_token required';
  end if;

  if p_product_id <> 'sipmate_premium' then
    raise exception 'invalid product';
  end if;

  insert into public.google_play_subscriptions (
    user_id,
    purchase_token,
    product_id,
    base_plan_id,
    subscription_state,
    expiry_time,
    acknowledgement_state,
    latest_order_id,
    auto_renew_enabled,
    last_verified_at,
    raw_response
  )
  values (
    p_user_id,
    p_purchase_token,
    p_product_id,
    p_base_plan_id,
    p_subscription_state,
    p_expiry_time,
    p_acknowledgement_state,
    p_latest_order_id,
    p_auto_renew_enabled,
    now(),
    coalesce(p_raw_response, '{}'::jsonb)
  )
  on conflict (purchase_token)
  do update set
    subscription_state = excluded.subscription_state,
    expiry_time = excluded.expiry_time,
    acknowledgement_state = excluded.acknowledgement_state,
    latest_order_id = excluded.latest_order_id,
    auto_renew_enabled = excluded.auto_renew_enabled,
    last_verified_at = now(),
    raw_response = excluded.raw_response;

  -- Do not trust the client. Premium is derived from Google's verified
  -- state and expiry time only.
  if p_subscription_state in (
      'SUBSCRIPTION_STATE_ACTIVE',
      'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
    )
    and p_expiry_time is not null
    and p_expiry_time > now()
  then
    update public.profiles
    set
      is_premium = true,
      premium_until = greatest(
        coalesce(premium_until, p_expiry_time),
        p_expiry_time
      )
    where id = p_user_id;
  end if;
end;
$$;

revoke all on function public.apply_google_play_premium(
  uuid, text, text, text, text, timestamptz, text, text, boolean, jsonb
) from public;

revoke all on function public.apply_google_play_premium(
  uuid, text, text, text, text, timestamptz, text, text, boolean, jsonb
) from anon;

revoke all on function public.apply_google_play_premium(
  uuid, text, text, text, text, timestamptz, text, text, boolean, jsonb
) from authenticated;

grant execute on function public.apply_google_play_premium(
  uuid, text, text, text, text, timestamptz, text, text, boolean, jsonb
) to service_role;
