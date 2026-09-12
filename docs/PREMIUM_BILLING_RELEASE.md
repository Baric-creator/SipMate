# SipMate Premium billing — release architecture

## Release decision

For the first Google Play release, Android is a **consumption-only** Premium client:

- The Android app does not sell digital subscriptions in-app.
- The Android app does not link to Stripe, the Premium website, or another external payment method.
- A Premium entitlement already active on the user's SipMate account is consumed by the Android app and unlocks Premium features after sign-in.
- Premium pricing may be displayed informationally in the Android app, but there is no purchase CTA.

The purchase and subscription-management path lives on the public website:

- `https://officialsipmate.com/premium.html`
- Authentication uses the same Supabase account as the app.
- Checkout uses the `create-checkout-session` Edge Function and Stripe Checkout.
- Subscription management uses the `create-customer-portal` Edge Function and Stripe Billing Portal.
- Stripe webhook events synchronize `premium_subscriptions`; database triggers synchronize `profiles.is_premium` / `premium_until`.

This keeps the initial Android release simple and avoids shipping an external-payment link inside the Play-distributed app.

## Pricing stages

- Monthly: 1.99 EUR / month.
- Founders yearly: 14.99 EUR first year, first 100 claimed yearly subscriptions.
- Early Access yearly: 17.99 EUR first year after Founders is full.
- Standard yearly: 19.99 EUR / year after Early Access.

`premium_offers` is the source of truth for the currently active yearly stage. `subscriber_count` is maintained from Stripe-linked subscription rows and the database stage function advances Founders -> Early Access -> Standard when the configured cap is reached.

## Security controls

- Checkout requires a valid SipMate user session.
- An already-active Premium subscription cannot start another checkout.
- Checkout accepts only `monthly` or `yearly`; the server selects the actual Stripe price ID.
- Return URLs are restricted to the official SipMate origin (plus explicit localhost development origins).
- Stripe secret keys stay server-side.
- Stripe webhook requests require a valid Stripe signature.
- Customer Portal is available only for the authenticated user's Stripe customer.
- Android source must not reference Stripe checkout or external Premium purchase URLs.

## Release smoke test

1. Sign in on `premium.html` using a test SipMate account without Premium.
2. Confirm active Founders/next yearly offer and monthly offer load correctly.
3. Start Stripe test checkout for one plan and complete payment.
4. Confirm return to `premium.html?checkout=success`.
5. Confirm `premium_subscriptions` becomes active and the user's profile becomes Premium.
6. Sign into the Android release build using the same account and confirm Premium features unlock automatically.
7. Confirm the Android Premium screen has no buy link/button and no Stripe/external-payment route.
8. Open website subscription management and confirm Stripe Portal opens and returns to `premium.html`.
9. Schedule cancellation and confirm Premium remains active until period end.
10. Confirm Stripe webhook updates and Founder counters/stage behavior.

## Later option: native Google Play Billing

Native Google Play Billing can be added after launch if purchasing directly inside Android becomes a priority. That requires Play Console subscription/base-plan setup, a native IAP library/development build, server-side Play purchase verification, entitlement reconciliation, restore handling, and Play subscription-management UX. Do not enable an Android purchase CTA until that end-to-end path is configured and tested.
