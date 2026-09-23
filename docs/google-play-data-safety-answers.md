# SipMate — Google Play Data Safety Answers

Last reviewed: 23 September 2026

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
- Precise coordinates are not intended to be publicly displayed to other users

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
- Shared: **No** in the Play Data Safety sense if only processed by infrastructure service providers; profile photos are intentionally displayed to other SipMate users as part of the service
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

Declare the closest Play Console categories available for:
- Cheers sent/received and mutual CHEERS status
- blocks, reports and skipped profiles
- social interactions
- voluntary tester/support problem reports

Suggested treatment:
- Collected: **Yes**
- Shared: **No**
- Purpose: **App functionality**, **Security/Fraud prevention** where applicable, and **Developer communications / support** where the Play form offers the closest matching purpose

### App info and performance / diagnostics

SipMate includes limited privacy-filtered reliability telemetry and, from builds containing installation tracking, a first-launch installation metric.

Declare the closest Play Console categories available for **Diagnostics** / **App info and performance** when the form asks about technical information used to diagnose failures or measure app health:
- app version
- platform
- limited technical error type/metadata
- first-launch timestamp
- randomly generated installation identifier used for aggregate install counts

Suggested treatment:
- Collected: **Yes**
- Shared: **No**, assuming backend/infrastructure providers remain service providers
- Purpose: **Analytics** and/or **App functionality** depending on the exact Play Console purpose choices shown
- The installation identifier is not an advertising identifier and is not used for ad targeting
- Telemetry is designed not to include passwords, authentication tokens, chat-message content or precise latitude/longitude

### Device or other identifiers

**Device or other identifiers**
- Collected: **Yes** if the Play form classifies Expo push tokens and/or the app-generated installation identifier here
- Used for push notification delivery and aggregate installation measurement
- Shared: **No**, assuming Expo/platform push delivery and Supabase are service-provider transfers
- Purpose: **App functionality**; **Analytics** may also apply to the app-generated installation metric depending on the exact Play form wording

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

## Payments / purchase data

The Play-distributed Android app is currently consumption-only for Premium and does not contain a Stripe purchase CTA. Website Premium purchases are processed by Stripe. Re-check the Play Data Safety purchase/payment categories if native Play Billing or another in-app purchase flow is added to Android later.

## Optional vs required

Be conservative when Play asks whether collection is optional or required.

- Email / user ID: **Required** for account functionality
- Name / age: **Required** at registration in current flow
- Location: permission can be denied, but Nearby functionality will not work; describe this consistently with final behavior
- Profile photo / gallery: **Optional**
- Bio / city / gender / currently-up-for extras: follow exact final UI behavior
- Chat messages / Cheers / reports / blocks: only collected when the user chooses to use those features
- In-app problem reports: **Optional**, user-initiated
- Installation/app-health telemetry: collected automatically in builds where the telemetry is enabled; answer the Play optional/required question according to the exact form definition rather than treating it as a user-entered field

## Account deletion answers

- Does the app support account creation? **Yes**
- Can users request account deletion from inside the app? **Yes**
- Can users request account deletion outside the app? **Yes**
- External deletion resource: `https://officialsipmate.com/delete-account.html`
- Does deletion remove associated user data? **Yes**, subject only to legitimate retention described in the Privacy Policy

## Privacy policy URL

`https://officialsipmate.com/privacy.html`

The privacy policy must remain publicly accessible and match actual app behavior, permissions, SDKs and service providers.

## Final pre-submit check

Before pressing Save/Submit in Data Safety, compare this guide against:

1. the exact production AAB manifest;
2. current `package.json` dependencies;
3. Supabase tables/Edge Functions;
4. current telemetry/diagnostics implementation;
5. any analytics, crash-reporting, ads or payment SDKs added later;
6. current Privacy Policy and account deletion behavior.

If any one of those changes, update the Data Safety form before publishing the new version.
