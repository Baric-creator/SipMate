# SipMate — Google Play Data Safety Answers

Last reviewed: 12 September 2026

Use this as a Play Console entry guide. Re-check after any SDK, analytics, ads, payment or permission change.

## Data safety overview

- Does the app collect or share user data? **Yes**
- Is all user data encrypted in transit? **Yes**, based on current SipMate HTTPS/TLS endpoints and Supabase/Expo service usage.
- Can users request deletion of their data? **Yes**
- Account deletion web URL: `https://officialsipmate.com/delete-account.html`
- In-app account deletion: **Yes**
- Account creation: **Yes**

## Data types to declare as collected

### Location

**Approximate location**
- Collected: **Yes**
- Shared: **No**, assuming infrastructure providers remain service providers acting on SipMate's behalf
- Purpose: **App functionality**
- Used for Nearby discovery / city-level proximity

**Precise location**
- Collected: **Yes**
- Shared: **No**, assuming infrastructure providers remain service providers
- Purpose: **App functionality**
- Used to calculate Nearby distance
- Important: precise coordinates are stored for Nearby calculations but are not intended to be publicly displayed to other users

### Personal info

**Name**
- Collected: **Yes**
- Shared: **No**
- Purpose: **App functionality**, **Account management**

**Email address**
- Collected: **Yes**
- Shared: **No**
- Purpose: **App functionality**, **Account management**

**User IDs**
- Collected: **Yes**
- Shared: **No**
- Purpose: **App functionality**, **Account management**, **Security/Fraud prevention**

**Other personal info**
- Collected: **Yes**
- Includes age, city, bio, gender, currently-up-for selection and profile settings
- Shared: **No**
- Purpose: **App functionality**

### Photos and videos

**Photos**
- Collected: **Yes**
- User-selected profile/avatar/gallery images
- Shared: **No** in the Play Data Safety sense if only processed by infrastructure service providers; however profile photos are intentionally displayed to other SipMate users as part of the service
- Purpose: **App functionality**

**Videos**
- Collected: **No** under the current implementation

### Messages

**Other in-app messages**
- Collected: **Yes**
- Includes SipMate chat messages
- Shared: **No**
- Purpose: **App functionality**

### App activity / user-generated activity

Declare the closest Play Console category available for:
- Cheers sent/received
- mutual CHEERS status
- blocks
- reports
- skipped profiles
- social interactions

Suggested treatment:
- Collected: **Yes**
- Shared: **No**
- Purpose: **App functionality**, **Security/Fraud prevention** where applicable

### Device or other identifiers

**Device or other identifiers**
- Collected: **Yes** if the Play form classifies Expo push tokens here
- Used for push notification delivery
- Shared: **No**, assuming Expo/platform push delivery is a service-provider transfer
- Purpose: **App functionality**

## Data types currently NOT expected

Do not declare these unless a future build actually adds them:
- Contacts
- SMS or call log
- Microphone/audio recordings
- Camera capture
- Health/fitness data
- Files/documents
- Calendar
- Advertising ID for ad targeting
- Browsing history
- Purchase history stored directly by SipMate beyond subscription/payment service metadata

## Optional vs required

Be conservative when Play asks whether collection is optional or required.

- Email / user ID: **Required** for account functionality
- Name / age: **Required** at registration in current flow
- Location: permission can be denied, but Nearby functionality will not work; describe this consistently with the final app behavior
- Profile photo / gallery: **Optional**
- Bio / city / gender / currently-up-for profile extras: follow the exact final UI behavior at release
- Chat messages / Cheers / reports / blocks: only collected when the user chooses to use those features

## Account deletion answers

For the Play Console deletion questions:

- Does the app support account creation? **Yes**
- Can users request account deletion from inside the app? **Yes**
- Can users request account deletion outside the app? **Yes**
- External deletion resource: `https://officialsipmate.com/delete-account.html`
- Does deletion remove associated user data? **Yes**, subject only to legitimate retention described in the Privacy Policy

Google requires account deletion to remove associated account data, not merely disable or freeze the account.

## Privacy policy URL

`https://officialsipmate.com/privacy.html`

The privacy policy must remain accessible publicly and must continue to match actual app behavior, permissions, SDKs and service providers.

## Final pre-submit check

Before pressing Save/Submit in Data Safety, compare this guide against:

1. the exact production AAB manifest;
2. current `package.json` dependencies;
3. Supabase tables/Edge Functions;
4. any analytics, crash-reporting, ads or payment SDKs added later;
5. current Privacy Policy and account deletion behavior.

If any one of those changes, update the Data Safety form before publishing the new version.