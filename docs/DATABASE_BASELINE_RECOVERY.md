# Database baseline recovery

## Finding

The production database contains core tables (`profiles`, `blocks`, `cheers`, `conversations`, `messages`, etc.) that were created before the migration history currently committed under `supabase/migrations/`.

A clean local `supabase db start` therefore reaches `20260903182200_harden_sipmate_rls_and_storage.sql` before those tables exist and fails on `alter table public.blocks ...`.

This is a reproducibility/recovery gap, not evidence that production is missing the tables.

## Release rule

Do not claim that a clean database can be reconstructed from Git until a sanitized baseline migration exists and `supabase db reset` / `supabase test db` pass from an empty local database.

Do not rewrite already-applied production migration history just to make local replay green.

## Safe repair sequence

1. Export schema-only definitions for application-owned schemas from the live project without user rows or secrets.
2. Build a baseline migration containing the pre-2026-09-03 table/type/trigger/function definitions needed by later migrations.
3. Validate the baseline in an isolated local database or disposable staging environment.
4. Run every committed migration from empty state.
5. Run `supabase test db` and the adversarial RLS suite.
6. Only after clean replay succeeds, make database-security CI mandatory rather than conditionally skipped for the known baseline gap.

## Why CI currently detects rather than hides this

The database-security job still runs `supabase db start`. It only treats the exact known missing-`public.blocks` baseline signature as a documented migration-history gap; any different startup failure remains fatal. The pgTAP suite runs automatically once migration replay becomes possible.
