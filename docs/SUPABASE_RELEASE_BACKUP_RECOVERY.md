# SipMate — Supabase Release Backup & Recovery

Purpose: reduce release risk before V9 and later production changes. This is an operational checklist, not a substitute for the backup features available in the Supabase plan.

## Before any release migration

1. Confirm the exact release commit and the exact migration files required by that build.
2. Run the repository database/migration audits before deployment.
3. Review every migration for destructive operations such as `drop table`, `drop column`, type rewrites, broad deletes or irreversible data transformations.
4. For destructive/data-rewrite migrations, take a database backup or verify a recent restorable backup exists before deployment.
5. Record the migration names and deployment time in the release notes/runbook.
6. Deploy backend changes before releasing a client that depends on them, unless the migration is explicitly backward compatible in the opposite direction.

## Preferred migration design

- Prefer additive schema changes first: new nullable/defaulted columns, new indexes, new functions.
- Use `if exists` / `if not exists` where appropriate for safe repeatability.
- Keep old client paths functional during the rollout window when possible.
- Avoid coupling a Play client release to an irreversible database change.
- Never store secrets, passwords, payment-card data or service-role keys in migrations or repository files.

## Pre-V9 recovery checkpoint

Before building V9, verify:

- [ ] Production database is reachable.
- [ ] Required migrations are present in the repository.
- [ ] Production migration state matches the release expectations.
- [ ] Critical RPCs used by V9 exist in production.
- [ ] Current Alpha v8 can still operate against the updated backend until testers update.
- [ ] No pending migration removes fields/functions still used by v8.
- [ ] A restorable backup/PITR capability is confirmed according to the active Supabase plan.
- [ ] The person performing the release knows where the restore controls are before making a destructive change.

## Rollback strategy

### Client-only bug

Do not roll back the database. Keep the current Play Alpha available and fix the client in the next candidate.

### Backward-compatible backend bug

Deploy a corrective migration/function update while keeping both v8 and the candidate compatible.

### Migration/function regression

1. Stop further deployments.
2. Identify the exact migration/function that introduced the regression.
3. Prefer a forward corrective migration over deleting migration history.
4. Verify v8 compatibility immediately after the correction.
5. Run core auth/Nearby/Cheers/chat/account-safety smoke checks.

### Data corruption or destructive migration

1. Stop writes/deployments where practical.
2. Do not improvise manual mass updates on production data.
3. Use the verified Supabase restore/PITR process appropriate to the active plan.
4. Validate authentication/profile/message/cheers/account ownership after restoration.
5. Only resume release work after the cause is understood and the migration is redesigned.

## Critical SipMate tables/areas to protect

The exact schema evolves, but release review should pay special attention to:

- `profiles`
- authentication-linked user records
- `cheers`
- chat/messages data
- blocks/reports/moderation records
- Premium subscription/entitlement records
- push-token records
- installation/feedback diagnostics

## Release rule

No destructive production migration should be applied simply to satisfy a UI improvement. If a change can be implemented additively and cleaned up after all supported clients move forward, prefer the additive path.
