begin;

create extension if not exists pgtap with schema extensions;
select plan(22);

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.cheers'::regclass), 'cheers RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.conversations'::regclass), 'conversations RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.messages'::regclass), 'messages RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.blocks'::regclass), 'blocks RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.reports'::regclass), 'reports RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.profile_photos'::regclass), 'profile_photos RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.premium_subscriptions'::regclass), 'premium_subscriptions RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.stripe_webhook_events'::regclass), 'Stripe webhook ledger RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.user_action_rate_limits'::regclass), 'rate-limit ledger RLS enabled');

select is((select count(*)::bigint from information_schema.role_table_grants where table_schema='public' and grantee='anon'),0::bigint,'anon has no direct public-table grants');
select is((select count(*)::bigint from information_schema.role_table_grants where table_schema='public' and table_name='stripe_webhook_events' and grantee in ('anon','authenticated')),0::bigint,'webhook ledger has no client grants');
select is((select count(*)::bigint from information_schema.role_table_grants where table_schema='public' and table_name='user_action_rate_limits' and grantee in ('anon','authenticated')),0::bigint,'rate-limit ledger has no client grants');

select ok(not has_table_privilege('authenticated', 'public.profiles', 'TRUNCATE'),'authenticated cannot truncate profiles');
select ok(not has_table_privilege('authenticated', 'public.messages', 'TRIGGER'),'authenticated cannot create triggers on messages');
select ok(not has_table_privilege('authenticated', 'public.reports', 'UPDATE'),'authenticated cannot update report moderation state');

select ok(exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_nearby_profiles' and p.prosecdef),'Nearby privacy RPC remains SECURITY DEFINER');
select ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prosecdef and n.nspname in ('public','private') and coalesce(array_to_string(p.proconfig, ','), '') !~ 'search_path='),'all public/private SECURITY DEFINER functions pin search_path');
select ok(position('current_user' in lower(pg_get_functiondef('private.enforce_social_action_quota()'::regprocedure))) = 0,'social action quota trigger derives caller from auth.uid(), not SECURITY DEFINER current_user');
select ok(position('current_user' in lower(pg_get_functiondef('private.set_reporter_id()'::regprocedure))) = 0,'report identity trigger derives caller from auth.uid(), not SECURITY DEFINER current_user');

select is(
  (select count(*)::bigint from pg_policies where schemaname='public' and tablename='profiles' and cmd='SELECT' and roles @> array['authenticated']::name[] and qual = '(( SELECT auth.uid() AS uid) = id)'),
  1::bigint,
  'direct profile SELECT is restricted to the authenticated owner'
);
select is(
  (select count(*)::bigint from pg_policies where schemaname='public' and tablename='profile_photos' and cmd='SELECT' and roles @> array['authenticated']::name[] and qual = '(( SELECT auth.uid() AS uid) = user_id)'),
  1::bigint,
  'direct profile photo SELECT is restricted to the authenticated owner'
);

select * from finish();
rollback;
