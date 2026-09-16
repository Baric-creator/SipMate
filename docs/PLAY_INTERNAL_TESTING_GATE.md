# SipMate — Google Play Internal Testing Gate

Last reviewed: 16 September 2026

This file is the practical go/no-go checklist for the first Google Play Internal Testing upload.

## READY / confirmed

- [x] Google Play developer-account verification confirmed.
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
- [x] Android Premium has a platform-specific consumption-only screen with no Stripe checkout or external billing link.
- [x] Current repository CI/release checks were green before the Google confirmation milestone.

## REQUIRED BEFORE FIRST INTERNAL-TRACK UPLOAD

- [ ] Create the SipMate app entry in Play Console.
- [ ] Run `npm ci`, `npm run check`, `npm run release:audit` and `npm run doctor` on the exact release commit.
- [ ] Confirm/apply the intended production Supabase migrations and deploy required Edge Functions from the reviewed commit.
- [ ] Create a fresh production AAB from committed `master`.
- [ ] Inspect the generated AAB / merged Android manifest for unexpected permissions.
- [ ] Upload/submit only to the Internal Testing draft track.
- [ ] Install the Play-delivered build on a physical Android device.
- [ ] Verify login with the dedicated Google reviewer account.
- [ ] Verify location denial does not crash the app.
- [ ] Verify location grant updates Nearby as expected.
- [ ] Verify profile photo picker still works with broad photo permissions blocked.
- [ ] Verify push notification registration works on the release build.
- [ ] Verify Cheers, mutual chat, Report and Block on disposable test users.
- [ ] Verify logout/login account isolation.
- [ ] Verify account deletion end-to-end on a disposable account.
- [ ] Verify Android Premium has no purchase CTA/link and recognizes an already-active Premium entitlement.

## PLAY CONSOLE ITEMS REQUIRED BEFORE REVIEW

- [ ] App access: mark login-restricted functionality and enter reviewer credentials.
- [ ] Data Safety: enter the prepared declarations and re-check them against the final AAB.
- [ ] Account deletion: declare in-app deletion and enter the public deletion URL.
- [ ] Content Rating: complete the questionnaire using the documented adult/social/UGC/alcohol-reference facts.
- [ ] Target Audience: adults only; not designed for children.
- [ ] Ads declaration: No, unless ads are introduced before upload.
- [ ] Privacy Policy URL entered in Play Console.
- [ ] Support email entered and monitored.

## PREMIUM RELEASE GATE

The first Android release is deliberately **consumption-only** for Premium.

Required for this release:

- [x] Android Premium source does not call `create-checkout-session`.
- [x] Android Premium source does not link to Stripe or the external Premium purchase page.
- [x] Existing Premium entitlement is read from Supabase and can unlock Premium features after sign-in.
- [ ] Verify those three properties again in the actual Play-delivered Internal Testing build.

Google Play Billing / RevenueCat purchase integration is a later feature, not a blocker for the first release as long as the Play build remains consumption-only.

## STORE ASSETS

Before production publication, confirm:

- [ ] 512×512 Play icon accepted by Play Console.
- [ ] 1024×500 feature graphic accepted.
- [ ] Current phone screenshots uploaded.
- [ ] Screenshots match the current UI and contain no debug/test errors or personal test data.

## GO / NO-GO DECISION

### Internal Testing
**GO once the app entry exists, release checks pass, backend deployment state is verified, the fresh AAB is manifest-checked and the build is uploaded as a draft Internal Testing release.**

### Production
**NO-GO until Play declarations, reviewer access, production backend verification, store assets and the Play-delivered physical-device smoke test are all green.**
