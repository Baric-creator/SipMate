# SipMate — Release day runbook

Use this when the remaining external confirmations are complete and the app is ready to move from prepared state to public launch.

## 1. Final pre-release checks

Before touching Play Console or changing the website launch phase:

```bash
git pull
npm ci
npm run preflight:android:production
```

Then confirm:
- CI on `master` is green.
- Privacy Policy, Terms, Imprint and Delete Account pages are live.
- `premium.html` is live and uses the same SipMate account as the app.
- Play Console identity/developer verification is complete.
- Data Safety, App Access, Content Rating, Target Audience and account deletion declarations are complete.
- Reviewer credentials work without OTP/MFA.
- Android Premium remains consumption-only: no Stripe checkout, no external payment link, no purchase CTA inside the Play-distributed app.
- Final screenshots and store listing match the current app.

## 2. Build and upload to Google Play Internal Testing

Use the prepared safe command:

```bash
npm run release:android:internal:ready
```

It runs production checks, builds the production AAB, then submits the newest production build using the existing production submit profile.

The first upload remains intentionally safe:
- Track: `internal`
- Release status: `draft`
- Changes are not automatically sent for review

Do not promote directly to production on the first upload.

## 3. Internal testing smoke test

Install the Play-delivered build, not a local debug APK, and verify on a physical Android device:

1. Register / log in.
2. Confirm Terms + Community Guidelines acceptance.
3. Grant location and verify Nearby.
4. Verify Discover cards and profile photos.
5. Verify Active/Inactive presence behavior.
6. Send Cheers.
7. Trigger mutual CHEERS.
8. Open chat and exchange messages in realtime.
9. Verify push delivery and notification-tap navigation.
10. Change profile photo.
11. Report and Block a test account.
12. Confirm Founder → Moderation can see and action the report.
13. Switch EN / DE / HR.
14. Logout and login again.
15. Delete a disposable account.
16. Open Premium: existing Premium entitlement may unlock features, but Android must expose no payment link or purchase button.

Stop the release if any core path crashes, exposes stale/private data, or Android shows an external digital-purchase route.

## 4. Premium web billing smoke test

Before public launch, complete one controlled Stripe test flow with a disposable/test SipMate account:

1. Sign in on `officialsipmate.com/premium.html`.
2. Verify Monthly and the currently active yearly stage.
3. Start Stripe test checkout.
4. Complete payment and confirm return to `premium.html?checkout=success`.
5. Confirm `premium_subscriptions` becomes active and the account is Premium.
6. Sign into the Android release candidate with the same account and confirm entitlement is recognized.
7. Open Stripe Customer Portal from the website.
8. Schedule cancellation and confirm access remains active until period end.
9. Confirm webhook/state sync and Premium counters.

Do not use a real customer payment merely to prove the flow; use the appropriate test path until launch configuration is intentionally live.

## 5. Play Console release progression

Recommended order:

Internal Testing → Closed/Open testing if required by the account → Production

Before production:
- Review the exact AAB permissions in Play Console.
- Confirm no unexpected camera, microphone, broad photo/video storage, background location or overlay permission appears.
- Confirm package `com.bariccreator.sipmate` and target SDK 36.
- Confirm store listing, privacy URL and deletion URL.
- Confirm App Access reviewer instructions.
- Confirm moderation/report handling is operational.
- Confirm Android Premium still matches the declared consumption-only release architecture.

## 6. Website launch switch

Only change the production website launch state after the Play Store URL is real and publicly reachable.

Sequence:
- `waitlist` — current/pre-approval state
- `preregister` — listing/pre-registration URL exists but app is not installable
- `live` — users can actually install SipMate

For `live`: set the real Google Play URL first, then switch the phase from Founder Dashboard. Check the homepage and download page in an incognito browser.

## 7. Public launch verification

Immediately after going live, check:
- `officialsipmate.com`
- `premium.html`
- privacy
- terms
- imprint
- contact
- account deletion
- download / Play Store CTA
- Founder Dashboard launch state
- Founder Dashboard moderation queue
- Instagram / TikTok
- WhatsApp / Discord

Then install from the public Play listing on a clean device and run the short core smoke test again.

## 8. Rollback rule

If a release-critical issue appears:
- Do not delete production data.
- Halt or pause the Play rollout.
- Switch the website away from `live` if new installs should stop.
- Keep billing state intact; do not manually delete subscriptions to repair an app bug.
- Fix on `master`, rerun preflight, build a new AAB, test, then resume.

## Current prepared state

Prepared in the repository/backend:
- Production AAB profile and API 36 setup
- Internal draft submit profile
- Production preflight + release audit
- One-command internal release helper
- Final merged release manifest audit
- Data Safety draft
- reviewer access instructions
- content rating / target audience guidance
- EN / DE / HR store listing copy
- privacy / terms / imprint / account-deletion web pages
- UGC report/block flow
- Founder moderation queue with audit trail
- Web Premium account/billing page
- Stripe checkout + webhook + Customer Portal path
- Automatic Premium entitlement/profile synchronization
- Automatic Founders → Early Access → Standard yearly stage logic
- Android consumption-only Premium gate

Remaining release gates are intentionally external/manual:
1. Google/Play account and identity approvals.
2. Final Play Console declarations and reviewer credentials.
3. One controlled Premium billing smoke test.
4. Fresh production AAB creation and Play-delivered real-device smoke test.
5. Production promotion and final website `live` switch.
