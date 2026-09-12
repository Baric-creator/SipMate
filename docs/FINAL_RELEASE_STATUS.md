# SipMate — Final release status

Status date: 2026-09-12

## Overall

**Repository / backend readiness: GREEN**

SipMate is prepared so that the remaining launch work is mostly external approval and controlled release-candidate testing rather than feature development.

## Green / prepared

- Android package and API 36 configuration.
- Production AAB and Internal Testing submit profiles.
- Release manifest audit and blocked unnecessary Android permissions.
- TypeScript, security and release-readiness CI.
- Login, registration, 18+ gate, Terms and Community Guidelines.
- EN / DE / HR app copy and UTF-8 audit.
- Location / Nearby / presence lifecycle.
- Cheers and mutual CHEERS flow.
- Realtime chat, read receipts, typing and push notification path.
- Report / Block user-safety flow.
- Founder moderation queue and moderation audit trail.
- Account deletion in-app and public deletion page.
- Privacy / Terms / Imprint / Contact web pages.
- Play Store listing copy, Data Safety guide, Content Rating / Target Audience guide and reviewer-access instructions.
- Web Premium billing page using the same SipMate account.
- Stripe Checkout, signed webhook synchronization and Customer Portal.
- Automatic Premium entitlement synchronization to profiles.
- Founders / Early Access / Standard yearly stage logic.
- Android Premium consumption-only release architecture: no external payment link or Stripe purchase inside the Play-distributed Android app.
- Website launch phase controller: waitlist → preregister → live.

## Current Premium pricing configuration

- Monthly: 1.99 EUR.
- Founders yearly: 14.99 EUR first year, first 100 claimed yearly subscribers.
- Early Access yearly: 17.99 EUR first year after Founders.
- Standard yearly: 19.99 EUR per year after Early Access.

The database is the source of truth for active offer stage and subscription-derived counters.

## Deliberately not executed yet

These actions are intentionally left for the release window because they involve external approval, payment testing or public distribution:

1. Final Google Play account/developer confirmation.
2. Completing all Play Console declarations in the console UI.
3. Supplying reviewer credentials in Play Console.
4. One controlled end-to-end Premium billing test using a test/disposable account.
5. Creating the fresh production AAB after confirmations.
6. Uploading/submitting it to Internal Testing and installing the Play-delivered build.
7. Final real-device smoke test.
8. Promotion to Production.
9. Setting the real Play Store URL and switching the website launch phase to `live`.

## Release commands

Preflight only:

```bash
npm run preflight:android:production
```

Build production AAB after preflight:

```bash
npm run build:android:production:ready
```

Build and submit the newest production build to the configured Internal Testing draft track:

```bash
npm run release:android:internal:ready
```

## GO / NO-GO rule

GO only when:
- current CI is green,
- Google/Play approvals are complete,
- Play Console declarations are complete,
- reviewer access works,
- Premium test flow is confirmed,
- the Play-delivered release candidate passes the smoke checklist,
- no unexpected final AAB permissions appear.

If any item fails, remain on waitlist/preregister and do not promote to Production.
