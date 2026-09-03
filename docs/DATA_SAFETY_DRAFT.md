# SipMate — Google Play Data Safety Draft

Use this as a preparation worksheet for the Google Play Console Data safety form. Confirm every answer against the production build and production backend before submission.

## Data collected by SipMate

### Personal info
- Email address — account authentication and account management.
- Name — profile and social discovery.
- Age — adult eligibility and profile display.
- City — profile and nearby context.
- Bio — optional profile content.

### Location
- Approximate location — nearby discovery and distance features.
- Precise location — used when the user grants location permission so SipMate can calculate nearby results and distance.

Location is requested while using the app. SipMate does not currently require background location permission.

### Photos
- Profile avatar and additional profile photos — user profile and discovery features.

### App activity / user-generated content
- Cheers interactions.
- Conversations and chat messages.
- Block relationships.
- Reports submitted for safety and moderation.
- Profile activity/status and currently-up-for preference.

### Purchase information
Premium subscription state and Stripe identifiers needed to provide and manage Premium access are stored. Full payment-card details are processed by Stripe and are not stored by SipMate.

## Main purposes
Data is used for:
- App functionality.
- Account management.
- Social discovery and communication.
- Personalization of nearby results.
- Fraud prevention, security and safety.
- Premium subscription management.

## Service providers
Production currently uses or is designed to use:
- Supabase for authentication, database, storage, realtime and Edge Functions.
- Stripe for Premium payment and subscription processing.
- Nominatim/OpenStreetMap-based reverse geocoding in the current location flow.

Check whether Google Play considers any production transfer to these providers "sharing" under the Data safety definitions before submitting the form.

## Security
- Authentication is handled through Supabase Auth.
- Database access uses row-level security policies where configured.
- Sensitive backend operations use server-side Supabase Edge Functions.
- Stripe secret keys and Supabase service-role credentials must never be included in the client application.

## Account deletion
SipMate includes an in-app Delete Account flow backed by a server-side Edge Function. A public external deletion-request URL/contact still needs to be finalized before production publication.

## Required final checks before Play Console submission
- Confirm production RLS and storage policies.
- Confirm all foreign keys/user-owned rows that should disappear on account deletion actually cascade or are explicitly deleted.
- Deploy and test the `delete-account` Edge Function with a disposable test user.
- Add the final public privacy-policy URL.
- Add the final external account-deletion request URL.
- Add the final public support/privacy email.
- Confirm whether crash/analytics SDKs are added before release; if added, update this document and the Play Console declaration.
