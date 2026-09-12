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
- Privacy Policy and Delete Account pages are live.
- Play Console identity/developer verification is complete.
- Data Safety, App Access, Content Rating, Target Audience and account deletion declarations are complete.
- Reviewer credentials work.
- Google Play Billing/RevenueCat is either fully working or Android Premium purchase UI remains gated/disabled.
- Final screenshots and store listing match the current app.

## 2. Build and upload to Google Play Internal Testing

The prepared safe command is:

```bash
npm run release:android:internal:ready
```

This runs production preflight checks, builds the production Android App Bundle, then submits the newest production build using the existing EAS production submit profile.

The production submit profile remains intentionally safe:
- Track: `internal`
- Release status: `draft`
- Changes are not automatically sent for review

Do not change this to production on the first upload.

## 3. Internal testing smoke test

Install the Play-delivered build, not a local debug APK, and verify on a physical Android device:

1. Register / log in
2. Terms + Community Guidelines acceptance
3. Location permission and Nearby
4. Discover profile cards
5. Active/inactive presence behavior
6. Send Cheers
7. Mutual CHEERS state
8. Open chat and exchange messages
9. Push notification delivery and notification tap
10. Change profile photo
11. Report and Block
12. Language switching EN / DE / HR
13. Logout and login again
14. Account deletion on a disposable account
15. Premium screen does not bypass Google Play Billing on Android

Stop the release if any core path crashes or shows stale/private data.

## 4. Play Console release progression

Recommended order:

Internal Testing → Closed/Open testing if required by the account → Production

Before promoting to production:
- Review the exact AAB permissions in Play Console.
- Confirm no unexpected photo/video, microphone, camera, background location or overlay permissions appear.
- Confirm the package is `com.bariccreator.sipmate` and target SDK is 36.
- Confirm store listing, privacy URL and deletion URL are still correct.
- Confirm moderation/report handling is operational.

## 5. Website launch switch

The SipMate website already has a launch phase system. On release day, change the production launch configuration only after the Play Store URL is real and publicly reachable.

Recommended phase sequence:
- `waitlist` — before Play listing is ready
- `preregister` — when the Play pre-registration/listing URL is available
- `live` — only when users can actually install SipMate

For `live`, set the real Google Play Store URL first, then switch the launch phase. Verify the main CTA and download page from a private/incognito browser after the change.

## 6. Public launch verification

Immediately after going live, test:
- `officialsipmate.com`
- privacy page
- terms page
- imprint page
- contact page
- account deletion page
- download CTA / Play Store link
- Instagram and TikTok links
- WhatsApp/Discord community links

Then install from the public Play listing on a device that did not have the development build installed and run a short smoke test again.

## 7. Rollback rule

If a release-critical problem appears:
- Do not delete production data.
- Pause promotion / halt rollout in Play Console.
- Switch the website CTA back to a non-live phase if the public build should not receive new users.
- Fix on `master`, run preflight, build a new AAB and test before resuming.

## Current prepared state

Already prepared in the repository:
- Production AAB profile
- Internal draft submit profile
- Production preflight command
- One-command internal release helper
- Android release manifest audit
- Data Safety draft
- reviewer access instructions
- content rating / target audience guidance
- store listing copy
- public privacy/account deletion pages

The remaining blockers are external account/review/billing/store-console steps and final real-device release-candidate testing.
