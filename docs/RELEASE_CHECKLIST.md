# SipMate — Google Play release checklist

Status snapshot: 3 September 2026

## Already prepared in the repository

- Android package ID: `com.bariccreator.sipmate`
- Android versionCode: 1
- Expo SDK 57 (targets Android API 36)
- Dark SipMate splash / adaptive icon background
- Location permissions configured
- EAS development APK profile (`developmentClient: true`, internal distribution)
- EAS preview APK profile
- EAS production Android App Bundle (`.aab`) profile
- EAS build profiles explicitly mapped to `development`, `preview` and `production` environments
- EAS CLI requires a clean committed Git state before builds
- Google Play submission profile is restricted to the internal track with draft release status
- Package scripts for Expo Doctor and Android development/preview/production builds
- English / German / Croatian UI coverage across the main MVP
- 18+ registration enforcement
- Block and report tools
- In-app account deletion entry and Edge Function scaffold
- Account-deletion backend safety gate: destructive auth deletion remains disabled unless `ACCOUNT_DELETION_ENABLED=true`
- Initial privacy policy draft
- Initial Play Store listing copy
- Google Play Data safety draft
- Community safety guidelines
- Android-specific Premium release gate that does not expose Stripe checkout
- Safe `.env.example`
- Working MVP backup branch
- Automated TypeScript CI check on `master`

## Must be completed before production submission

1. Create/login to an Expo account and link this project to EAS.
2. Install `expo-dev-client` with the repository script `npm run setup:dev-client`. This intentionally uses Expo's installer so `package.json` and `package-lock.json` are updated together with the SDK-compatible version.
3. Run `npm run doctor` and resolve any release-relevant dependency/configuration warnings.
4. Commit the `expo-dev-client` package and lockfile changes, push them, and confirm CI is green before building.
5. Configure the required client environment variables in all EAS environments (`development`, `preview`, `production`) and verify them with `eas env:list`. Never commit real environment files or server secrets.
6. Run `npm run build:android:development`, install the APK on a real Android phone, and test the native app before adding/testing the final billing implementation.
7. After native smoke testing, run a preview Android build and test the release-like APK on a real phone.
8. Run the production `.aab` build only after the release gates below are complete.
9. Add a public privacy-policy URL. Google Play requires the privacy policy to be publicly accessible and linked inside the app.
10. Finish account deletion safely: verify database/storage deletion behavior, cancel any paid subscription before deletion, add the required external web resource for deletion requests, then enable `ACCOUNT_DELETION_ENABLED=true` only after a disposable-user end-to-end deletion test passes.
11. Add a real public support/privacy contact address to the privacy policy and Play listing.
12. Complete the Play Console Data safety form accurately, including location, profile data, photos, authentication, chat/user-generated content and payment-related processing.
13. Complete the content-rating questionnaire. SipMate should be configured for adults because it is centered around social drinking meetups.
14. Upload required store assets: 512x512 icon, 1024x500 feature graphic and phone screenshots.
15. **PAYMENTS RELEASE GATE:** do not ship the current Stripe Checkout purchase flow as the default Android in-app purchase flow. SipMate Premium unlocks digital app functionality, so Google Play Billing is required unless SipMate is enrolled in and correctly implements an eligible alternative-billing / billing-choice program for the user's market. See `docs/PLAY_BILLING_PLAN.md`.
16. Test Premium purchase, renewal, cancellation and restore behavior with the final Android billing implementation before promoting from testing to production.
17. Review Supabase RLS policies and production CORS settings one final time.
18. Remove temporary diagnostics/debug logging that is not needed in production.

## EAS environment release gate

The app currently needs these client-side variables from `.env.example`:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

They must exist in the EAS environment used by each remote build. Configure and verify them only after the project is linked to the correct Expo/EAS project:

```bash
npx eas-cli@latest env:list --environment development
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest env:list --environment production
```

If a value needs to be created or changed, use the EAS dashboard or `eas env:set`; do not paste real values into repository files, documentation, commit messages, screenshots or chat logs. `EXPO_PUBLIC_*` values are compiled into the client bundle and therefore must never contain service-role keys, Stripe secrets, webhook secrets or any other server-only credential.

The Supabase URL and anon/publishable client key are intended for client use when the database is protected by correct RLS policies. Server-only Supabase service-role keys and Stripe secrets belong in their server environment (for example Supabase Edge Function secrets), not in EAS client variables.

Before each first build for an environment, confirm that both required client variables are present. A successful TypeScript check does not prove that remote EAS environment variables are configured.

## Account deletion release gate

The `delete-account` Edge Function now refuses destructive account deletion unless the server-side environment variable `ACCOUNT_DELETION_ENABLED` is exactly `true`. This is deliberate. Deleting only the Supabase Auth identity before database rows, storage objects and paid subscriptions are verified could leave orphaned data or an active subscription attached to a deleted account.

Do not enable this flag in production until all of the following are proven with a disposable paid and unpaid test account:

- active paid subscriptions are cancelled or otherwise safely terminated before identity deletion
- user-owned storage objects are removed as intended
- user-owned database rows are removed by verified cascades or explicit cleanup
- retained moderation/report records follow the published privacy policy
- the Auth user is deleted last
- the client signs out cleanly and cannot continue using the deleted session
- repeated deletion attempts fail safely and do not recreate data

A visible in-app Delete Account button is not enough for release; the backend behavior and the required external deletion-request resource must both be complete before submission.

## First native Android development-build pass

After pulling the latest repository, run these commands from the SipMate project root in this order:

```bash
npm install
npm run setup:dev-client
npm run doctor
git status
git diff -- package.json package-lock.json
```

At this point, stop if Expo Doctor reports a release-relevant problem. Confirm that `expo-dev-client` was added to both package metadata files, then commit and push those generated dependency changes so CI validates the same dependency tree that will be built.

Then continue with EAS:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest build:configure
npx eas-cli@latest env:list --environment development
npm run build:android:development
```

Why development first: the development build is the correct place to validate native behavior and native libraries on a real device before producing release artifacts. `expo-dev-client` is deliberately installed through `npx expo install`, not by manually pinning package metadata in GitHub.

Do not start the development build until the required development EAS variables have been verified. Remote EAS builders do not automatically receive a developer's gitignored local `.env` file.

## Development APK acceptance gate

Do not move to the preview build just because EAS says the build succeeded. The development APK passes only when all of these are true:

- the APK installs and launches from the Android home screen
- the SipMate development client can connect to the Metro development server
- there is no startup crash or missing native-module error
- Supabase authentication works in the native build
- location permission can be granted and Nearby loads normally
- image picker/gallery access works on the physical device
- realtime chat still receives messages without manual refresh
- Android `/premium` resolves to the Android release-gate screen and never opens Stripe checkout
- logout/login survives an app restart as expected

Record any native-only failure before touching the production profile. Fix and rebuild development first.

## Preview and production build pass

After the development APK is installed and the native smoke test passes:

```bash
npx eas-cli@latest env:list --environment preview
npm run build:android:preview
```

After the preview APK passes the complete release checklist and the Android billing gate is implemented and tested:

```bash
npx eas-cli@latest env:list --environment production
npm run build:android:production
```

The production profile generates an Android App Bundle suitable for Google Play upload. A successful TypeScript CI run is necessary but does not replace testing the native APK/AAB behavior.

## Native smoke-test minimum

Before treating an Android build as a release candidate, verify on a physical device:

- registration and login
- location permission and Nearby distance/location behavior
- profile editing and avatar/gallery upload
- ACTIVE / INACTIVE visibility
- Cheers one-way and mutual CHEERS flow
- chat send/receive, realtime update and unread/read state
- block, report and unblock
- language switching and persistence
- privacy/community/delete-account navigation
- Android Premium screen does not expose Stripe checkout
- existing Premium entitlement is displayed correctly
- final Google Play Billing purchase/restore/cancel behavior once billing is integrated

## Google Play API requirement

As of 31 August 2026, new Google Play apps and updates must target Android 16 / API level 36 or higher. Expo SDK 57 targets API level 36, so the current SipMate SDK line satisfies that target-level requirement.
