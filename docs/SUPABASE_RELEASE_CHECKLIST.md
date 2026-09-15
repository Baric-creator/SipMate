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
- `20260915205000_enforce_active_session_window.sql`
- `20260915205100_safe_active_session_insert_trigger.sql`
- `20260915205200_bound_profile_text_fields.sql`
- `20260915205300_preserve_presence_clear.sql`

The existing Discord OAuth/feed migrations already lock their internal bookkeeping tables away from app clients; the database contract audit checks those original migrations directly. The migration-version audit also blocks duplicate 14-digit migration versions before release checks can pass.

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
- Starting a new Active session gets a server-authored three-hour window; direct client writes cannot extend an existing session into the future.
- Setting a profile inactive clears `active_until` and `last_seen_at` at the database boundary.
- Sending the app to background can still clear `last_seen_at` without the Active-session trigger forcing the user back online.
- Creating a new profile with Active enabled succeeds and the trigger does not attempt to read `OLD` during INSERT.
- Direct profile writes cannot exceed the app limits for name (50), city (80), bio (300), or unsupported gender values.
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

Specifically retest `register-push-token` register/unregister behavior after deploying it, retest Discord connect/disconnect after deploying `discord-oauth`, verify malformed Discord identity payloads fail closed, and verify repeated Premium checkout taps within the idempotency window reuse one Stripe Checkout request. Discord linkage must not be cleared if Premium-role revocation fails, so the operation can be retried safely.

Deploy and smoke-test `send-welcome-email` from repository source as well. It requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, must send only to the authenticated user's Supabase email, and must not trust an arbitrary email address supplied in the request body. Confirm one disposable signup receives the expected EN/DE/HR welcome message and that repeated/manual calls cannot target another address.

Verify provider-failure behavior too: Expo/Discord/Resend calls are timeout-bounded, Discord Cheers announcement reservations roll back after a failed provider call, and stale push-token cleanup stays scoped to the intended recipient.

## 7. Evidence

Record the tested commit SHA, linked Supabase project reference, final migration-list output, Edge Function deployment date, and disposable test results in private release notes. Repository CI proves static contracts; it does not prove the production database or deployed Edge Functions match the repository.
