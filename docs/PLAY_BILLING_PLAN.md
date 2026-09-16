# SipMate Android Premium billing plan

Status: 16 September 2026

## Current release decision

For the first Google Play release, SipMate Android is a **consumption-only Premium client**.

That means:

- the Play-distributed Android app does not sell digital subscriptions in-app;
- the Android Premium screen does not open Stripe Checkout;
- the Android Premium screen does not link to the external Premium purchase page;
- the Android Premium screen does not expose Stripe subscription management;
- an already-active Premium entitlement on the signed-in SipMate account is recognized and consumed by the app.

The platform-specific implementation is `src/app/premium.android.tsx`. The repository release audit treats that file as release-critical and fails if Stripe checkout/external purchase links reappear.

## Web Premium

The website remains the current Premium purchase and subscription-management surface:

- Stripe Checkout is started by `create-checkout-session`;
- Stripe webhook events synchronize subscription state into Supabase;
- Stripe Customer Portal handles website subscription management;
- the same Supabase account is used by the website and app;
- Android reads the resulting Premium entitlement but does not steer the user to an external purchase flow from inside the Play build.

See `docs/PREMIUM_BILLING_RELEASE.md` for the release architecture and smoke test.

## Release implications

Native Google Play subscription products, base plans, RevenueCat and Restore Purchases are **not prerequisites for the first release** while Android remains consumption-only.

The release must still verify on the Play-delivered build that:

1. no Premium purchase CTA appears;
2. no Stripe or external payment URL can be opened from the Android Premium screen;
3. a user whose SipMate account already has Premium receives the expected Premium features after sign-in;
4. a Free account remains Free;
5. Premium expiry is respected.

## Later option: native Google Play Billing

If direct Android purchasing is added after launch, treat it as a separate release project. Before enabling any Android purchase CTA:

- create the intended subscription products/base plans in Play Console;
- choose and integrate a supported Play Billing implementation (direct or a service such as RevenueCat);
- bind purchases to the authenticated SipMate user identity;
- verify purchases server-side before granting entitlement;
- handle acknowledgement, restore/resync, renewals, cancellation, grace period, account hold and expiry;
- prevent overlapping Stripe and Play subscriptions for the same user;
- test purchase, restore, cancellation and expiry through a Play testing track;
- update Data Safety/store copy/declarations if the shipped behavior changes.

Until that full path is implemented and tested, keep the Android release consumption-only.
