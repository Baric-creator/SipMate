# SipMate Android Premium billing plan

Status: 3 September 2026

## Why this is a release blocker

SipMate Premium sells digital app functionality: direct messaging, additional discovery controls, visibility into received Cheers, extra profile photos and other Premium-only features.

For apps distributed through Google Play, purchases of digital goods, subscriptions and app functionality generally must use Google Play Billing unless the app qualifies for and correctly implements one of Google's permitted alternative-billing / billing-choice programs.

The current SipMate implementation uses Stripe Checkout through the `create-checkout-session` Supabase Edge Function. That flow works on the web, but it must not automatically become the production Android in-app purchase path.

## Current architecture

- Web Premium purchase flow: Stripe Checkout.
- Stripe webhook synchronizes Premium state into `premium_subscriptions` and `profiles`.
- Stripe Customer Portal is used for subscription management.
- Premium entitlement is read from Supabase and consumed by the app.

This entitlement model is useful and should be preserved. The Android billing provider can change without rewriting the Premium feature checks throughout the app.

## Safe production direction

### Web

Keep Stripe Checkout for the web build.

### Android distributed through Google Play

Before production release, choose one compliant Android path:

1. Integrate Google Play Billing for Premium subscriptions; or
2. Enroll in an eligible Google billing-choice / alternative-billing program and implement every required API, user-choice, reporting and market restriction correctly.

For a first public release, Google Play Billing is the simpler compliance baseline.

## Recommended implementation shape

Keep Premium entitlement provider-independent in Supabase.

Suggested subscription fields/metadata should distinguish the provider, for example:

- `billing_provider`: `stripe` or `google_play`
- provider subscription / purchase identifier
- product/base-plan identifier
- status
- started/expires timestamps
- renewal/cancellation state

Do not remove the existing Stripe columns until the migration strategy is tested.

## Android implementation checklist

- Define monthly and yearly subscription products in Play Console.
- Preserve the intended SipMate prices and decide how Founders / Early Access pricing maps to Play base plans or offers.
- Integrate a supported Google Play Billing client for Expo/React Native.
- Verify purchases server-side before granting Premium.
- Store provider + purchase/subscription identifiers in Supabase.
- Handle purchase acknowledgement as required by Google Play.
- Handle renewals, cancellations, grace periods, account hold and expiry.
- Add restore/resync behavior for returning users.
- Test on a Play internal testing track using licensed tester accounts.
- Verify that Premium entitlement remains correct after app reinstall and login on another device.
- Test monthly/yearly upgrade or plan-switch behavior before enabling it.

## Stripe subscriber migration / coexistence

Existing Stripe test subscriptions must not be confused with Play subscriptions.

For production Android:

- Existing Stripe entitlement may continue to be recognized by the backend if legally/policy appropriate.
- Do not show a generic Stripe purchase button inside the Play-distributed Android app unless the selected Google program explicitly permits the exact flow and SipMate is enrolled.
- Do not create two simultaneously renewing subscriptions for the same user.

## Account deletion interaction

Account deletion must handle the active billing provider before deleting the auth user. A deleted account must not continue to be billed silently.

Before deploying destructive deletion:

- verify the user's active provider;
- cancel or otherwise correctly terminate the active renewable subscription;
- remove user-owned database rows/storage according to the verified schema and retention policy;
- delete the auth user only after required cleanup succeeds.

## Release rule

A green TypeScript CI run is not enough to release Premium payments. The Android Premium purchase path must pass an actual Play internal-test purchase, renewal/cancellation and entitlement-sync test before production submission.
