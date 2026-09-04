revoke all privileges on all tables in schema public from anon;

revoke truncate, trigger, references on all tables in schema public from authenticated;

revoke update on table public.blocks, public.cheers, public.conversations, public.reports, public.skipped_profiles from authenticated;
revoke delete on table public.conversations, public.messages, public.premium_offers, public.premium_subscriptions, public.profiles, public.reports from authenticated;
revoke insert, update, delete on table public.premium_offers, public.premium_subscriptions from authenticated;
