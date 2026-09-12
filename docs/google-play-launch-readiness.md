# SipMate — Google Play Launch Readiness

Last reviewed: 12 September 2026

This checklist is based on the current SipMate codebase and current Google Play policy requirements. It is intended as a release-preparation guide, not legal advice.

## Current status

**Overall: GOOD / close to internal testing readiness.**

### Green

- Android package: `com.bariccreator.sipmate`
- Production build: Android App Bundle (`app-bundle`)
- Expo SDK 57 targets Android 16 / API 36, matching Google Play's current requirement for new apps and app updates from 31 August 2026.
- Foreground location only is declared in `app.json`: `ACCESS_COARSE_LOCATION` + `ACCESS_FINE_LOCATION`.
- No `ACCESS_BACKGROUND_LOCATION` permission is declared.
- Microphone permission is explicitly blocked.
- Location permission text explains the Nearby use case.
- Privacy Policy is public: `https://officialsipmate.com/privacy.html`
- External account deletion information is public: `https://officialsipmate.com/delete-account.html`
- In-app account deletion exists and calls an authenticated `delete-account` Edge Function.
- Registration is 18+ and requires explicit acceptance of Terms of Use + Community Guidelines before account creation.
- In-app Report and Block controls exist for user profiles.
- Community Guidelines and Terms prohibit harassment, threats, hate, stalking, scams, spam, impersonation and illegal activity.
- Push-token registration and message-notification Edge Functions now require JWT verification.

## Must complete in Play Console before review

### 1. Data safety

SipMate transmits user data off-device to provide the service, so **Data collected = Yes**.

Based on the current implementation, review and declare at minimum:

| Google Play data area | SipMate use | Suggested purpose |
| --- | --- | --- |
| Personal info — Name | Profile/display name | App functionality, Account management |
| Personal info — Email address | Authentication/account | App functionality, Account management |
| Personal info — User IDs | Supabase user/account IDs | App functionality, Account management, Security |
| Personal info — Other info | Age, city, bio, currently-up-for, profile settings | App functionality |
| Location — Approximate location | Nearby discovery when approximate permission/location is used | App functionality |
| Location — Precise location | Nearby distance/discovery when precise permission is granted | App functionality |
| Photos and videos — Photos | User-uploaded profile photos | App functionality |
| Messages — Other in-app messages | SipMate chat messages | App functionality |
| App activity — Other user-generated content / interactions | Cheers, blocks, skips, reports and related social activity | App functionality, Safety/Security |
| Device or other identifiers | Push notification token/device delivery identifier | App functionality |

**Sharing:** Supabase, Expo/platform push services and similar infrastructure may qualify as service providers when they process data only on SipMate's behalf. Google Play's Data safety rules generally do not require those service-provider transfers to be declared as "sharing," but the final declaration must match each provider's actual role and contract.

**Encryption in transit:** answer Yes only if all user data transmitted by the app and its included SDKs is encrypted in transit. Current SipMate service endpoints use HTTPS/TLS.

**Deletion:** answer Yes — users can request account deletion in-app and via the published web path.

### 2. Account deletion declaration

In Play Console → App content → Data safety / Account deletion:

- Confirm that account creation is supported.
- Confirm that users can delete their account in the app.
- Provide this external deletion URL:
  `https://officialsipmate.com/delete-account.html`

Keep both paths working after launch.

### 3. App access for Google reviewers

SipMate requires sign-in for core functionality. In Play Console → App content → App access:

- Mark that some/all functionality is restricted by login.
- Provide a working reviewer/test account.
- Do **not** store the reviewer password in this repository.
- Confirm the reviewer can reach Discover, Nearby, Profile, Cheers, Chat, Report, Block, Privacy, Terms and Delete Account without needing SMS, a private invite, or another person's device.

### 4. Content rating

Complete the official Play content-rating questionnaire before submission. The app must not remain unrated.

Important facts to answer consistently:

- 18+ service by product design.
- Social networking / user profiles.
- User-generated profile text/photos.
- 1:1 chat after CHEERS.
- References to alcoholic drinks are part of the social concept, but SipMate does not sell alcohol.

### 5. User-generated content (UGC)

SipMate contains UGC (profiles, photos and chat). Google Play expects:

- Terms / user policy accepted before users create/upload UGC — **implemented**.
- Clear definition/prohibition of objectionable behavior — **implemented in Terms/Guidelines**.
- In-app reporting — **implemented**.
- In-app blocking for 1:1/social interaction — **implemented**.
- Ongoing moderation/action on reports — **operational process required at launch**.

Before production launch, make sure reported users/content are actually reviewed and actioned in a timely way; having the buttons alone is not enough.

## Location review

Current configuration uses foreground location only. This is the preferred and lower-friction path for Google Play.

- Keep `ACCESS_BACKGROUND_LOCATION` out unless a future feature truly needs it.
- The user should be able to deny location and still access non-location portions of the app where practical.
- Because both COARSE and FINE permissions are present, Data safety should accurately disclose both approximate and precise location collection where applicable.
- Do not state that precise location is never collected: SipMate stores coordinates for Nearby calculations. The correct privacy claim is that precise coordinates are not intentionally shown publicly to other users.

## Notifications

Push notifications are used for service/message notifications.

- Registration is authenticated.
- Sending a message notification is authenticated and verifies the caller owns the message.
- Notification permission should be requested in context, not presented misleadingly as mandatory for account access.

## Build / API level

Current project uses Expo SDK 57. Expo documents SDK 57 with:

- `compileSdkVersion`: 36
- `targetSdkVersion`: 36

Google Play currently requires new mobile apps and updates submitted after 31 August 2026 to target Android 16 / API 36 or higher. Current SDK choice is compliant.

## Before uploading the next production AAB

1. Run `npm run typecheck`.
2. Run `npm run security:audit` or `npm run check`.
3. Run `npx expo-doctor@latest`.
4. Create a fresh production AAB: `npm run build:android:production`.
5. Install/test the same release candidate on at least one physical Android device before promotion.
6. Test: register → Terms acceptance → login → location prompt → Nearby → Cheers → mutual chat → push notification → Report → Block → logout → login → Delete Account.
7. Confirm Privacy Policy and Delete Account web URLs return HTTP 200.
8. Complete Data safety, App access, Content rating and account-deletion declarations in Play Console.

## Remaining launch risks

### High priority

- **Reviewer credentials:** must be configured in Play Console and tested before review.
- **Data safety form:** must exactly match the actual collected data and SDK behavior.
- **Moderation operations:** reports need a real review/action process, not only UI controls.

### Medium priority

- Verify the final generated AAB manifest does not contain unexpected permissions added by dependencies.
- Verify account deletion removes/handles all account-linked records as described in the public policy.
- Recheck screenshots/store text after the next UI build so store listing matches the actual app.

## Do not add unless needed

Avoid adding broad/background permissions, contacts access, microphone access, SMS/call-log permissions, broad photo-library access or advertising identifiers unless a real core feature requires them and the related Play declaration is completed.
