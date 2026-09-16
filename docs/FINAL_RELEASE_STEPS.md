# SipMate — final release steps

This is the short path from the current repository to a testable Google Play build.

## Repository work already prepared

- Android package: `com.bariccreator.sipmate`
- Expo SDK 57 / Android API 36 line
- EAS development, preview and production profiles
- Production Android App Bundle profile
- Production submit profile restricted to Google Play `internal` track, draft status, and changes held for manual review
- EAS CLI requires a clean committed Git state before builds
- Android uses `src/app/premium.android.tsx`, which is consumption-only: it does not expose Stripe checkout, an external Premium purchase link, or subscription management
- Web Premium purchase and subscription management remain on `officialsipmate.com` and synchronize entitlement into Supabase
- Privacy, community guidelines, account deletion UI, block/report and 18+ registration are present
- EN / DE / HR Store listing copy and Play declaration guides are prepared
- Automated TypeScript, regression, security, database, website and release checks run on pushes to `master`
- Local environment files, Android signing files and common Google Play service-account JSON filenames are ignored by Git

## Google Play account status

- Developer-account identity verification: **confirmed by Google on 16 September 2026**
- Play Console is available and currently shows no apps created yet

## Owner / console steps that still require the account UI

1. Create the SipMate app entry in Google Play Console.
2. Fill App access, Data Safety, account deletion, Content Rating, Target Audience, Ads and Privacy Policy declarations from the prepared docs.
3. Enter the dedicated reviewer credentials without committing the password to GitHub.
4. Upload/confirm the 512×512 icon, 1024×500 feature graphic and current phone screenshots.
5. Configure EAS/Google Play submission credentials when the first Internal Testing upload is ready.

Native Google Play Billing / RevenueCat is **not required for the first release** because the Play-distributed Android build does not sell Premium in-app. If native Android purchasing is added later, treat it as a separate tested feature and do not enable a purchase CTA until the full Play Billing flow is ready.

## Release build sequence

On the release machine, use the exact current `master` commit:

```bash
npm ci
npm run check
npm run release:audit
npm run doctor
git status
```

Do not build from a dirty working tree.

Verify the production EAS environment, then create the fresh Play bundle:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest env:list --environment production
npm run build:android:production:ready
```

Inspect the resulting AAB / merged Android manifest before upload. The release must not unexpectedly request camera, microphone, broad media/storage, overlay or background-location permissions.

For the first Play upload, keep the existing submit profile unchanged and submit only to the Internal Testing draft track:

```bash
npm run submit:android:latest
```

Do not switch the submit track to Production or remove the draft/manual-review gates until the Play-delivered build has passed the final smoke test.

## Final smoke path

Use a physical Android device and the Play-delivered Internal Testing build. Verify at minimum:

Login / registration → location deny → location allow → Nearby → Profile → profile photo → Cheers → mutual chat → push notification → Report → Block → logout/login → Premium entitlement recognition → Privacy / Terms → Delete Account.

Also verify that the Android Premium screen contains **no purchase CTA and no Stripe/external-payment link** while still recognizing an already-active Premium entitlement.

## Do not call the app production-ready until all are true

- Current CI and release audit are green on the exact release commit
- Production Supabase migrations and release-required Edge Functions are verified/deployed from the reviewed commit
- Play Console declarations are complete and accurate
- Dedicated reviewer access works on a physical device
- Public privacy-policy and account-deletion URLs are live
- Store assets are accepted by Play Console
- Fresh production AAB has been manifest-checked
- Play-delivered Internal Testing build passes the real-device smoke checklist
- Android Premium remains consumption-only in the Play build
- No critical/high unexpected dependency or runtime issue is open
