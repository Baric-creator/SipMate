# SipMate — Google Play Internal Testing Gate

Last reviewed: 12 September 2026

This file is the practical go/no-go checklist for the first Google Play Internal Testing upload.

## READY / confirmed in repository

- [x] Android package is `com.bariccreator.sipmate`.
- [x] Expo owner/project is linked in `app.json`.
- [x] Production Android build type is `app-bundle` (AAB).
- [x] Submit profile targets Google Play `internal` track.
- [x] Submit profile uses `releaseStatus: draft` and holds changes for manual review.
- [x] Foreground location only: `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION`.
- [x] No background-location permission declared.
- [x] Camera, microphone and broad media/storage permissions are explicitly blocked.
- [x] Privacy Policy URL is published.
- [x] External account-deletion page is published.
- [x] In-app account deletion exists.
- [x] 18+ registration gate exists.
- [x] Terms / Community Guidelines acceptance exists.
- [x] Block and Report flows exist.
- [x] Reviewer access instructions are documented in `docs/PLAY_REVIEWER_ACCESS.md`.
- [x] Data Safety answers are drafted in `docs/google-play-data-safety-answers.md`.
- [x] Content Rating / Target Audience answers are drafted in `docs/PLAY_CONTENT_RATING_TARGET_AUDIENCE.md`.
- [x] Store Listing copy exists in EN / DE / HR.
- [x] Dependency audit HIGH issue was removed with a non-breaking npm audit fix.
- [x] TypeScript / security CI passed after the dependency fix.

## REQUIRED BEFORE FIRST INTERNAL-TRACK UPLOAD

These are the remaining technical gates that should be completed before uploading the release candidate AAB:

- [ ] Run `npm run check` on the exact release commit.
- [ ] Run Expo Doctor on the exact release commit.
- [ ] Create a fresh production AAB from the current committed `master`.
- [ ] Inspect the generated AAB / merged Android manifest for unexpected permissions.
- [ ] Confirm the production build starts and reaches Login/Create Account on a real Android device or Play test install.
- [ ] Verify login with the dedicated Google reviewer account.
- [ ] Verify location denial does not crash the app.
- [ ] Verify location grant updates Nearby as expected.
- [ ] Verify profile photo picker still works with broad photo permissions blocked.
- [ ] Verify push notification registration works on the release build.
- [ ] Verify Report and Block on a disposable test user.
- [ ] Verify account deletion end-to-end on a disposable account.

## PLAY CONSOLE ITEMS REQUIRED BEFORE REVIEW

Internal Testing can be prepared while these forms are being completed, but they must be accurate before review/promotion:

- [ ] App access: mark login-restricted functionality and enter reviewer credentials.
- [ ] Data Safety: enter the prepared declarations and re-check them against the final AAB.
- [ ] Account deletion: declare in-app deletion and enter the public deletion URL.
- [ ] Content Rating: complete the IARC questionnaire using the documented 18+ / social / UGC / alcohol-reference facts.
- [ ] Target Audience: adults only; not designed for children.
- [ ] Ads declaration: No, unless ads are introduced before upload.
- [ ] Privacy Policy URL entered in Play Console.
- [ ] Support email entered and publicly monitored.

## BILLING / PREMIUM GATE

Current Android Premium release must not expose a web Stripe checkout for digital Premium sold inside the Google Play-distributed Android app.

Before Android Premium purchases are enabled:

- [ ] Google Play subscription products/base plans exist.
- [ ] RevenueCat or direct Google Play Billing integration is configured.
- [ ] Purchase succeeds with a Google Play license tester.
- [ ] Restore Purchases works.
- [ ] Cancellation / expiry behavior is tested.
- [ ] Existing Stripe Premium users cannot be charged twice.

If Premium purchase UI is still gated/disabled on Android, Internal Testing can proceed for the rest of the app while billing integration is finished.

## STORE ASSETS

Before production publication, confirm:

- [ ] 512x512 Play icon accepted by Play Console.
- [ ] 1024x500 feature graphic ready.
- [ ] 4–8 current phone screenshots uploaded.
- [ ] Screenshots match the current UI and do not show test/debug errors.

## GO / NO-GO DECISION

### Internal Testing
**GO once the release AAB is built, manifest-checked and smoke-tested.**

The remaining Play Console declarations and billing work do not prevent us from preparing an internal draft test release as long as the app does not expose a non-compliant Android Premium checkout.

### Production
**NO-GO until billing, reviewer access, Data Safety, account deletion, moderation operations, store assets and final Play declarations are all verified.**
