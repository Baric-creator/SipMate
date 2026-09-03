# SipMate — Android Premium billing implementation path

Status: 3 September 2026

## Decision

Use Google Play Billing for Premium purchases in the Play-distributed Android app. RevenueCat (`react-native-purchases`) is the preferred integration layer because it wraps Google Play Billing and provides server-side purchase validation / entitlement infrastructure without requiring SipMate to maintain the full billing backend itself.

The existing Stripe checkout remains web-only. `src/app/premium.android.tsx` intentionally does not expose Stripe purchase links while Play Billing is not configured.

## Why this fits the current Expo project

Expo's current in-app-purchase guidance lists `react-native-purchases` as an Expo-compatible option. In-app-purchase libraries contain native code, so real purchases cannot be tested with the normal Expo Go workflow; SipMate needs an Expo development build / EAS build for real Android billing tests.

Expo SDK 57 targets Android API 36, so the current SDK line is suitable for the current Play target requirement.

## External setup required before enabling purchases

1. Link `com.bariccreator.sipmate` to an Expo/EAS project and produce a signed Android build.
2. Create the SipMate app in Google Play Console with the exact package ID.
3. Create Google Play subscription products for monthly and yearly Premium pricing.
4. Create a RevenueCat project and connect its Google Play app/service credentials.
5. Configure a `premium` entitlement and an Android offering that maps to the Play subscription products.
6. Add the RevenueCat Android public SDK key to the production build environment. Do not commit private credentials or service-account JSON.
7. Install the RevenueCat SDK with Expo-compatible dependency resolution and create a development build. Do not assume Expo Go can execute real purchases.

## SipMate identity rule

Configure RevenueCat with the authenticated Supabase user UUID as the RevenueCat App User ID. This gives SipMate a stable identity for reconciling purchases with the existing Supabase profile and avoids relying on device-local anonymous purchaser IDs.

## Entitlement architecture

Premium access should ultimately be provider-independent:

- Google Play / RevenueCat purchase -> verified `premium` entitlement
- Existing web Stripe subscription -> verified Stripe entitlement
- Supabase profile exposes the resulting Premium state used by app features

Do not let an Android client directly set `profiles.is_premium` or `premium_until`. Premium state must come from trusted billing verification / backend synchronization.

## Android purchase flow to implement

1. User opens Premium.
2. App loads the current RevenueCat offering.
3. App displays localized monthly/yearly plans.
4. User purchases a package through Google Play Billing.
5. RevenueCat returns updated CustomerInfo.
6. App unlocks Premium only when the `premium` entitlement is active.
7. Backend synchronization records the provider and entitlement/subscription state in Supabase.
8. A Restore Purchases action re-checks Google Play purchases and entitlement state.

## Migration / duplicate-subscription protection

Before allowing an Android purchase, SipMate must check whether the same Supabase user already has an active web Stripe subscription. If yes, do not encourage a second subscription. Show that Premium is already active and provide neutral management guidance appropriate to the original purchase channel.

Likewise, users with active Google Play Premium should not be offered a second web subscription when SipMate can reliably identify the same account.

## Testing gate

Before production release test at least:

- monthly purchase
- yearly purchase
- purchase cancellation
- renewal / expiration entitlement changes
- restore purchases after reinstall
- same account on a second Android device
- existing Stripe Premium account logging into Android
- prevention of duplicate Stripe + Google Play subscriptions
- failed/cancelled purchase
- offline/error state
- sign-out/sign-in with different Supabase accounts on one device

Use Google Play testing tracks / license testers and an actual development or store build. Do not treat Expo Go mock/preview behavior as billing verification.

## Do not do yet

Do not remove the Android safety gate until Play products, RevenueCat configuration, backend entitlement synchronization, restore behavior and real-device billing tests are all complete.
