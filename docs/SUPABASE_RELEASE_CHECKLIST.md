# SipMate — Supabase release checklist

Repository migrations are source code, not proof that the linked production database already contains them. Complete this checklist immediately before any public release.

## 1. Link and inspect the intended project

From the repository root, use the Supabase CLI only after confirming the project reference is the intended production project.

```powershell
npx supabase@latest status
npx supabase@latest migration list --linked
```

Do not continue if the linked project is unexpected or if migration history differs in a way that is not understood.

## 2. Review pending SQL before applying it

Pay particular attention to the latest security and runtime migrations:

- `20260915150500_chat_list_respects_active_until.sql`
- `20260915193000_harden_device_push_tokens.sql`
- `20260915195000_enforce_premium_gallery_limit.sql`
- `20260915200000_enforce_adult_profile_age.sql`
- `20260915201000_restrict_profile_write_columns.sql`
- `20260915202000_restrict_profile_photo_writes.sql`
- `20260915203000_harden_profile_signup_trigger.sql`
- `20260915204000_bound_device_push_token_length.sql`

The existing Discord OAuth/feed migrations already lock their internal bookkeeping tables away from app clients; the database contract audit checks those original migrations directly.

Run the repository checks before touching the remote database:

```powershell
npm ci
npm run check
npm run release:audit
```

## 3. Apply migrations deliberately

After reviewing the linked migration list and pending SQL:

```powershell
npx supabase@latest db push --linked
```

Treat any unexpected destructive change, missing relation, privilege error, or divergent migration history as a release blocker. Do not repair production history by deleting old migration files.

## 4. Verify the remote migration state

```powershell
npx supabase@latest migration list --linked
```

The latest repository migration must appear as applied before claiming the production backend is current.

## 5. Run disposable-account smoke tests

Use at least two normal accounts and one Premium account. Verify:

- Active status expires and expired users disappear from Nearby/Active indicators.
- Chat list and chat membership stay account-scoped after logout/login switching.
- Blocks prevent contact in both directions.
- A Free account cannot insert Premium gallery photos.
- A Premium account cannot exceed six gallery photos, including rapid/concurrent insert attempts.
- An authenticated client cannot set `is_premium`, `premium_until` or Discord linkage fields through direct profile writes.
- An authenticated client cannot write another user's profile or delete another user's gallery row.
- Direct Auth signup without a valid age, below 18, or above 120 is rejected by the database signup trigger.
- Existing profile writes cannot persist an age below 18 or above 120.
- App clients cannot SELECT/INSERT/UPDATE/DELETE `device_push_tokens` directly.
- `register-push-token` can register/unregister only the caller's exact Expo token after JWT validation and rejects oversized tokens.
- Stored push tokens are constrained to 1–256 characters at the database boundary.
- App clients cannot access `discord_oauth_states` or `discord_cheers_announcements` directly.
- Logout removes the current device token; account deletion removes remaining tokens.
- Account deletion removes profile Storage files and the user only after subscription/storage/database cleanup succeeds.

## 6. Edge Functions

Database migrations do not deploy Edge Function source. Confirm the release-required functions have been deployed from the same reviewed commit and that their required environment secrets are configured. Do not print or commit secret values while verifying them.

Specifically retest `register-push-token` register/unregister behavior after deploying it, and retest Discord connect/disconnect after deploying `discord-oauth`: linkage must not be cleared if Premium-role revocation fails, so the operation can be retried safely.

## 7. Evidence

Record the tested commit SHA, linked Supabase project reference, final migration-list output, Edge Function deployment date, and disposable test results in private release notes. Repository CI proves static contracts; it does not prove the production database or deployed Edge Functions match the repository.
