begin;

create extension if not exists pgtap with schema extensions;
select plan(47);

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

select is((select count(*)::bigint from pg_policies where schemaname='public' and tablename='profiles' and cmd='SELECT' and roles @> array['authenticated']::name[] and qual = '(( SELECT auth.uid() AS uid) = id)'),1::bigint,'direct profile SELECT is restricted to the authenticated owner');
select is((select count(*)::bigint from pg_policies where schemaname='public' and tablename='profile_photos' and cmd='SELECT' and roles @> array['authenticated']::name[] and qual = '(( SELECT auth.uid() AS uid) = user_id)'),1::bigint,'direct profile photo SELECT is restricted to the authenticated owner');

select ok(position('current_user' in lower(pg_get_functiondef('public.claim_stripe_webhook_event(text,text,integer)'::regprocedure))) = 0,'webhook claim RPC does not trust SECURITY DEFINER current_user');
select ok(position('auth.role()' in lower(pg_get_functiondef('public.claim_stripe_webhook_event(text,text,integer)'::regprocedure))) > 0,'webhook claim RPC validates JWT service role');
select ok(position('current_user' in lower(pg_get_functiondef('public.complete_stripe_webhook_event(text)'::regprocedure))) = 0,'webhook complete RPC does not trust SECURITY DEFINER current_user');
select ok(position('auth.role()' in lower(pg_get_functiondef('public.complete_stripe_webhook_event(text)'::regprocedure))) > 0,'webhook complete RPC validates JWT service role');
select ok(position('current_user' in lower(pg_get_functiondef('public.fail_stripe_webhook_event(text,text)'::regprocedure))) = 0,'webhook fail RPC does not trust SECURITY DEFINER current_user');
select ok(position('auth.role()' in lower(pg_get_functiondef('public.fail_stripe_webhook_event(text,text)'::regprocedure))) > 0,'webhook fail RPC validates JWT service role');

select ok(position('bool_or(expires_at is null)' in lower(pg_get_functiondef('public.sync_profile_premium_status(uuid)'::regprocedure))) > 0,'Premium sync preserves active subscriptions without an expiry');
select ok(not has_function_privilege('authenticated','public.sync_profile_premium_status(uuid)','EXECUTE'),'authenticated cannot invoke Premium status synchronization directly');

select ok((select p.prosecdef from pg_proc p where p.oid = 'private.can_read_avatar_object(text)'::regprocedure),'avatar read helper is SECURITY DEFINER so profile owner-only RLS cannot break authorized media reads');
select ok(position('search_path=pg_catalog, public' in coalesce(array_to_string((select p.proconfig from pg_proc p where p.oid='private.can_read_avatar_object(text)'::regprocedure), ','), '')) > 0,'avatar read helper pins search_path');
select ok(not has_function_privilege('anon','private.can_read_avatar_object(text)','EXECUTE'),'anonymous callers cannot execute avatar read helper');
select ok(has_function_privilege('authenticated','private.can_read_avatar_object(text)','EXECUTE'),'authenticated storage policy can execute avatar read helper');
select ok(exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Authenticated avatar read' and cmd='SELECT' and qual like '%can_read_avatar_object%'),'authenticated avatar storage read policy delegates authorization to hardened helper');
select ok(position('object_name not like ''%/%''' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper rejects root objects without an owner path');
select ok(position('object_name like ''%/../%''' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper rejects traversal-like object paths');
select ok(position('object_name like ''%//%''' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper rejects empty path segments');
select ok(position('owner_text <> owner_id::text' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper requires canonical UUID owner prefixes');
select ok(position('avatar.webp' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper allowlists canonical avatar filenames');
select ok(position('gallery-[0-9]+' in lower(pg_get_functiondef('private.can_read_avatar_object(text)'::regprocedure))) > 0,'avatar read helper allowlists numbered gallery filenames');

select ok(exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_avatar_path_approved_check' and pg_get_constraintdef(oid) like '%avatar\\.%'),'profile avatar_path is constrained to canonical avatar filenames');
select ok(exists (select 1 from pg_constraint where conrelid='public.profile_photos'::regclass and conname='profile_photos_storage_path_approved_check' and pg_get_constraintdef(oid) like '%gallery-%'),'gallery storage_path is constrained to numbered gallery filenames');
select ok(has_column_privilege('authenticated','public.profiles','avatar_path','UPDATE'),'authenticated own-profile flow can update avatar_path');
select ok(has_column_privilege('authenticated','public.profile_photos','storage_path','INSERT'),'authenticated gallery flow can insert storage_path');
select ok(not has_column_privilege('authenticated','public.profiles','is_premium','UPDATE'),'authenticated cannot update server-managed is_premium');
select ok(not has_column_privilege('authenticated','public.profiles','premium_until','UPDATE'),'authenticated cannot update server-managed premium_until');

select * from finish();
rollback;