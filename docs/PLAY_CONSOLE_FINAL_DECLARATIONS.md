# SipMate Google Play final declarations

Use this as the final Play Console entry checklist. Values must match the shipped AAB and privacy policy.

## App identity
- Package: `com.bariccreator.sipmate`
- App: SipMate
- Account creation: Yes
- Account deletion in app: Yes
- External account deletion web resource: REQUIRED before production review.

## Data safety
Declare collection of:
- Precise location and approximate location — app functionality (nearby discovery). Foreground use only.
- Name/profile identity, age, gender, city, bio/currently-up-for — app functionality/account management.
- User photos — app functionality.
- User-generated messages and social interactions (Cheers, blocks, reports) — app functionality/safety.
- Authentication/account identifiers — account management/security.
- Purchase/subscription state — account management/app functionality. Payment-card data is handled by the billing provider and must not be declared as collected by SipMate unless the shipped SDK/server actually receives it.

Data is encrypted in transit. Account/data deletion is supported once the production deletion gate is enabled after end-to-end verification.

## Permissions
Expected Android runtime location permissions:
- ACCESS_COARSE_LOCATION
- ACCESS_FINE_LOCATION
No background location. RECORD_AUDIO is explicitly blocked.

## App content
- Ads: declare No unless ads are added before release.
- Target audience: adults only; registration enforces 18+.
- Social/user-generated content: Yes. Complete applicable UGC/content-rating declarations accurately.
- App access: provide reviewer credentials/instructions if authentication blocks review.
- Privacy policy: public HTTPS, non-PDF, non-editable URL required in Play Console and accessible in-app.
- Data deletion URL: public web page required outside the app.

## Billing
Android Premium must use Google Play Billing for digital subscription purchases distributed through Google Play. Keep Stripe checkout disabled on Android. Configure monthly/yearly products and entitlement mapping in the chosen Play Billing implementation before enabling Android Premium purchase UI.

## Release gate
Do not move beyond internal/draft until:
1. generated AAB manifest has been inspected,
2. Play Data safety matches actual SDK/data behavior,
3. external deletion URL is live,
4. Android Play Billing purchase/restore/cancel/expiry is tested,
5. account deletion is tested on a disposable account including Storage and relational cleanup,
6. all Play Console required declarations show complete.
