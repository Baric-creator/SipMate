# SipMate — Closed Alpha Operations

Status: active closed Alpha

This runbook keeps the current Play-delivered build stable while tester feedback is collected and grouped into the next release candidate.

## Rule for the current Alpha build

Do not rebuild only because a minor improvement exists in `master`. The Play-delivered Alpha stays the reference build until there is a concrete reason to replace it.

Create the next Alpha build when at least one of these is true:

- a reproducible crash, login failure, data-loss issue or broken core flow is confirmed;
- a safety/privacy issue needs a client change;
- several confirmed tester bugs can be bundled into one release;
- the current build has completed a useful testing cycle and the next release contains enough value to justify resetting tester attention.

## What testers should exercise

1. Fresh install from Google Play.
2. Register / sign in / forgot password.
3. Location denied, then granted.
4. Active / inactive visibility and Nearby behavior.
5. Profile create/edit, profile photo and gallery.
6. Send Cheers and create mutual CHEERS.
7. Start chat, send text, receive realtime messages, read state and push notifications.
8. Premium entitlement display for an already-Premium account; no Android purchase path.
9. Report / Block / Account & Safety.
10. Logout, login again and verify account isolation.
11. Delete a disposable account end-to-end.

## Feedback triage

Treat tester reports in this order:

### P0 — immediate release candidate
- app will not start;
- authentication is unusable for multiple users;
- account/data isolation failure;
- private message or precise-location exposure;
- account deletion failure with material privacy impact;
- reliable crash in a core path.

### P1 — include in next build
- Cheers/chat/nearby/profile core feature broken;
- push notifications consistently fail;
- status/presence is materially wrong;
- photo upload or moderation path broken;
- repeated UI defect that blocks use.

### P2 — normal backlog / batch
- a non-blocking functional defect;
- intermittent performance issue;
- usability issue with a working workaround;
- improvement worth bundling into the next meaningful Alpha update.

### P3 — cosmetic / later polish
- copy, spacing, icon, animation or minor visual issues;
- cosmetic inconsistency that does not block use;
- optional feature requests that are not required for the current test goal.

## Reproduction standard

Before changing code, record:

- app version and native Play build number;
- device and Android version when known;
- screen / flow;
- exact steps;
- expected result;
- actual result;
- whether it reproduces again after relaunch;
- whether another tester/device reproduces it.

Do not include passwords, message content, payment-card data or precise coordinates in bug notes.

## Founder/App Health workflow

Use the App Health feedback table as the single operational queue during Closed Alpha:

1. Filter reports by build, category or status.
2. Assign P0/P1/P2/P3 severity.
3. Mark the report `REVIEWED` after reproduction/assessment.
4. Mark it `RESOLVED` only after the fix is verified, not merely committed.
5. Keep all unresolved P0/P1 items visible before deciding to build V9.

The V9 readiness score is an internal triage indicator only. It is not a Google Play approval score and must not replace the release gate below.

## V9 release gate

Before building the next Alpha candidate:

- [ ] All P0/P1 items selected for V9 have a reproducible description.
- [ ] Fixes are committed to `master`.
- [ ] `npm run check` is green on the exact release commit.
- [ ] `npm run release:audit` is green.
- [ ] `npm run doctor` is green or any warning is explicitly reviewed and accepted.
- [ ] Current production Supabase migrations/functions required by the build are deployed.
- [ ] Production database recovery/backup readiness is checked using `docs/SUPABASE_RELEASE_BACKUP_RECOVERY.md`.
- [ ] Current Play Alpha remains compatible with backend changes until testers update.
- [ ] Android Premium remains consumption-only with no Stripe/external purchase CTA.
- [ ] V9 notes are prepared from `docs/V9_RELEASE_NOTES_TEMPLATE.md` and contain tester-visible changes only.
- [ ] Fresh production AAB is created from the exact green commit.
- [ ] Manifest/permissions are checked for unexpected additions.
- [ ] Play-delivered build is installed on a physical Android phone.
- [ ] Core smoke test passes before the tester group is told to update.

## V9 smoke test

Minimum pass:

`install → register/login → forgot password → location deny/grant → Nearby → Cheers → mutual CHEERS → chat text/image → push → Report/Block → logout/login → Account & Safety → delete disposable account`

Also verify every exact P0/P1 bug fixed for V9 on the same Play-delivered build and confirm the feedback report records the correct app version/native build number.

## Decision discipline

Keep `master` moving with safe diagnostics, tests, documentation and backend operations, but avoid unnecessary client churn while Alpha users are testing. Prefer one meaningful V9 over several tiny builds.
