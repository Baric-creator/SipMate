# SipMate — Google Play release checklist

Status snapshot: 2 September 2026

## Already prepared in the repository

- Android package ID: `com.bariccreator.sipmate`
- Android versionCode: 1
- Expo SDK 57 (targets Android API 36)
- Dark SipMate splash / adaptive icon background
- Location permissions configured
- EAS preview APK profile
- EAS production Android App Bundle (`.aab`) profile
- English / German / Croatian UI coverage across the main MVP
- 18+ registration enforcement
- Block and report tools
- Initial privacy policy draft
- Initial Play Store listing copy
- Safe `.env.example`
- Working MVP backup branch

## Must be completed before production submission

1. Create/login to an Expo account and link this project to EAS.
2. Configure production environment variables in EAS/Supabase; never commit secrets.
3. Run a preview Android build and test it on a real phone.
4. Run the production `.aab` build.
5. Add a public privacy-policy URL. Google Play requires the privacy policy to be publicly accessible and linked inside the app.
6. Add an in-app account deletion flow and an external web resource for account deletion. Google Play requires both for apps that allow account creation.
7. Add a real public support/privacy contact address to the privacy policy and Play listing.
8. Complete the Play Console Data safety form accurately, including location, profile data, photos, authentication, chat/user-generated content and payment-related processing.
9. Complete the content-rating questionnaire. SipMate should be configured for adults because it is centered around social drinking meetups.
10. Upload required store assets: 512x512 icon, 1024x500 feature graphic and phone screenshots.
11. Test Premium purchase/cancellation with the production deployment configuration before promoting from testing to production.
12. Review Supabase RLS policies and production CORS settings one final time.

## Build commands after pulling the latest repository

```bash
npm install
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

After the preview build has been tested successfully:

```bash
npx eas-cli build --platform android --profile production
```

The production profile generates an Android App Bundle suitable for Google Play upload.

## Google Play API requirement

As of 31 August 2026, new Google Play apps and updates must target Android 16 / API level 36 or higher. Expo SDK 57 targets API level 36, so the current SipMate SDK line satisfies that target-level requirement.
