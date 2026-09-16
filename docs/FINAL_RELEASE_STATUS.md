# SipMate — Final release status

Status date: 2026-09-16

## Overall

**Repository / backend readiness: GREEN**

**Google Play developer-account verification: CONFIRMED**

SipMate is now past the developer-account verification blocker. The remaining launch work is Play Console setup, controlled backend deployment verification, production AAB creation, Internal Testing and final real-device smoke testing.

## Green / prepared

- Google confirmed the Play developer account on 16 September 2026.
- Android package and API 36 configuration.
- Production AAB and Internal Testing submit profiles.
- Release manifest audit and blocked unnecessary Android permissions.
- TypeScript, regression, security, database, website and release-readiness checks.
- Login, registration, 18+ gate, Terms and Community Guidelines.
- EN / DE / HR app copy.
- Location / Nearby / timed presence lifecycle.
- Cheers and mutual CHEERS flow.
- Realtime chat, read receipts, typing and push notification path.
- Report / Block user-safety flow.
- Moderation backend and audit trail.
- Account deletion in-app and public deletion page.
- Privacy / Terms / Imprint / Contact web pages.
- Play Store listing copy, Data Safety guide, Content Rating / Target Audience guide and reviewer-access instructions.
- Web Premium billing page using the same SipMate account.
- Stripe Checkout, signed webhook synchronization and Customer Portal on the website.
- Automatic Premium entitlement synchronization to profiles.
- Founders / Early Access / Standard yearly stage logic.
- Android Premium consumption-only release architecture via `premium.android.tsx`: no Stripe checkout or external purchase link inside the Play-distributed Android app.
- Discord 25 Crew Giveaway website and backend reward ledger/source prepared in the repository.
- Website launch phase controller: waitlist → preregister → live.

## Current Premium pricing configuration

- Monthly: 1.99 EUR.
- Founders yearly: 14.99 EUR first year, first 100 claimed yearly subscribers.
- Early Access yearly: 17.99 EUR first year after Founders.
- Standard yearly: 19.99 EUR per year after Early Access.

The database is the source of truth for Premium entitlement and offer state.

## Remaining release-window work

1. Create the SipMate app entry in Google Play Console.
2. Complete Play Console declarations using the prepared repository docs.
3. Add and verify dedicated reviewer credentials.
4. Confirm/finish Play Store assets and screenshots in the Console.
5. Deliberately verify/apply pending production Supabase migrations and deploy required Edge Functions from the reviewed commit; repository presence alone is not proof of production deployment.
6. Run one controlled website Premium entitlement test with a disposable/test account and confirm the Android app only consumes the resulting entitlement.
7. Run release preflight and Expo Doctor on the exact release commit.
8. Create the fresh production AAB.
9. Inspect final manifest/permissions.
10. Upload/submit only to Internal Testing draft first.
11. Install the Play-delivered build and perform the physical-device smoke checklist.
12. Promote to Production only after those gates are green.
13. Set the real Play Store URL and switch the website launch phase to `live` only when publication is actually ready.

## Release commands

Preflight only:

```bash
npm run preflight:android:production
```

Build production AAB after preflight:

```bash
npm run build:android:production:ready
```

Submit the newest production build to the configured Internal Testing draft track:

```bash
npm run submit:android:latest
```

## GO / NO-GO rule

GO only when:
- current CI is green on the exact release commit,
- Play Console declarations are complete,
- reviewer access works,
- production backend state matches the reviewed repository state,
- the fresh AAB has no unexpected permissions,
- the Play-delivered release candidate passes the physical-device smoke checklist,
- Android Premium remains consumption-only with no external purchase CTA/link.

If any item fails, remain on waitlist/preregister and do not promote to Production.
