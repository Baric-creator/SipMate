# SipMate — final release steps

This is the short path from the current repository to a testable Google Play build.

## Repository work already prepared

- Android package: `com.bariccreator.sipmate`
- Expo SDK 57 / Android API 36 line
- EAS development, preview and production profiles
- Development APK profile with `developmentClient: true`
- Production Android App Bundle profile
- Production submit profile restricted to Google Play internal track, draft status, and changes held for manual review
- EAS CLI requires a clean committed Git state before builds
- Android Premium release gate prevents shipping the existing web Stripe purchase flow as the Android purchase UI
- Billing implementation plan documented for Google Play / RevenueCat
- Privacy, community guidelines, account deletion UI, block/report and 18+ registration are present
- Automated TypeScript checks run on pushes to `master`
- Local environment files, Android signing files and common Google Play service-account JSON filenames are ignored by Git

## Owner/account steps that cannot be completed from repository code

1. Sign in to an Expo account and link SipMate to EAS.
2. Create/select the SipMate app in Google Play Console with package `com.bariccreator.sipmate`.
3. Create the Google Play Premium subscription products and base plans.
4. Create/configure the RevenueCat project and connect the Google Play app.
5. Add the RevenueCat Android public SDK key through a production-safe environment configuration. Do not commit private/service credentials.
6. Provide a real public support/privacy contact address.
7. Publish a public privacy-policy URL and public account-deletion request URL.
8. Upload the Google Play service-account key to EAS credentials when EAS Submit is ready. Keep the JSON outside the repository.

## Billing implementation sequence

Do not install or wire a purchase SDK until the Play/RevenueCat project exists and the product identifiers are known.

After those values exist:

1. Install `expo-dev-client` and `react-native-purchases` using Expo-compatible installation commands.
2. Configure RevenueCat only on Android with the public Android SDK key.
3. Use the authenticated Supabase user UUID as RevenueCat `appUserID` so Premium ownership maps to the correct SipMate account.
4. Fetch the current RevenueCat Offering instead of hardcoding localized store prices.
5. Purchase the selected Google Play package from the Android Premium screen.
6. Add Restore Purchases.
7. Treat RevenueCat entitlement state as the source for Google Play purchase ownership and synchronize SipMate Premium entitlement server-side before relying on it for protected Premium features.
8. Prevent a second subscription when the user already has an active Stripe or Google Play Premium entitlement.
9. Test purchase, cancellation, renewal, expiration, reinstall and restore with Google Play test accounts.

## Build sequence

After pulling the current `master` branch locally:

```bash
npm install
npm run setup:dev-client
npm run doctor
git status
git diff -- package.json package-lock.json
```

Commit and push the generated `expo-dev-client` dependency changes before starting an EAS build. Then link/authenticate EAS, verify the development environment variables, and build:

```bash
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest build:configure
npx eas-cli@latest env:list --environment development
npm run build:android:development
```

Use the development APK for real-device native integration/testing. Do not move on merely because the cloud build succeeded.

Then verify the preview environment and create the release-like preview APK:

```bash
npx eas-cli@latest env:list --environment preview
npm run build:android:preview
```

After the release checklist, billing gate and native smoke tests are green, verify production variables and create the Play Store bundle:

```bash
npx eas-cli@latest env:list --environment production
npm run build:android:production
```

For the first safe Play upload, keep the existing production submit profile unchanged and submit the latest production build to the internal draft release:

```bash
npm run submit:android:latest
```

For a non-interactive CI environment with the required Expo authentication already configured:

```bash
npm run submit:android:latest:ci
```

Do not switch the submit track to production or remove the draft/manual-review gates until the Play Console release checklist is complete.

## Do not call the app production-ready until all are true

- Real Android device smoke test passes
- Google Play test purchase and restore pass
- Existing web Stripe subscriber cannot be double-charged through Android
- Account deletion safely handles active subscriptions, database rows and storage objects
- Public privacy and deletion URLs are live
- Play Console Data safety form matches actual app behavior
- Content rating is completed for the 18+ social-drinking use case
- Store screenshots, 512x512 icon and 1024x500 feature graphic are ready
- Production AAB installs through a Play testing track and passes final smoke testing
