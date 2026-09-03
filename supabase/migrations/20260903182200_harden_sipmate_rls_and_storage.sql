-- Applied to production on 2026-09-03. Keep this migration as the source-of-truth record.
alter table public.blocks enable row level security;
alter table public.cheers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.premium_offers enable row level security;
alter table public.premium_subscriptions enable row level security;
alter table public.profile_photos enable row level security;
alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.skipped_profiles enable row level security;

-- Duplicate permissive policies were removed in production. INSERT rules now enforce identity + block state.
-- See docs/SUPABASE_POLICY_REQUIREMENTS.md for the complete policy contract.

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'avatars';
