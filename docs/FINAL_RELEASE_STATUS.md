# SipMate — Final release status

Status date: 2026-09-23

## Overall

**Repository / backend readiness: GREEN**

**Google Play Closed Test — Alpha: PUBLISHED**

SipMate version **8 (1.0.0)** has been published to the Closed Test — Alpha track and successfully installed from Google Play with a second tester account. The Play-delivered build launches and the tested core flows work. Tester invitations have been sent to the closed-test group.

## Confirmed in the current testing cycle

- Google Play developer-account verification completed.
- Android package `com.bariccreator.sipmate` and API 36 configuration.
- Closed Test — Alpha version 8 published in Play Console.
- Play-delivered installation verified on a physical Android device.
- Login / registration / profile / location / Nearby / Cheers / chat tested without a currently known blocker.
- Forgot-password delivery repaired by configuring Supabase Auth with custom Resend SMTP on the verified SipMate domain; reset email and password-reset flow verified end to end.
- Foreground location only; no background-location permission.
- Camera, microphone and broad media/storage permissions remain blocked.
- Privacy Policy, Terms, Community Guidelines and account-deletion pages are published.
- In-app account deletion, Report and Block flows exist.
- Android Premium remains consumption-only: no Stripe checkout or external Premium purchase link in the Play Android build.
- Founder App Health now tracks install first-launch metrics, registration, 7-day activity, Cheers users, chat users, Premium conversion and tester activity.
- Privacy-safe installation telemetry is prepared for the next app build; it does not retroactively count installs of older builds.
- In-app tester problem reporting is prepared for the next app build, with founder-only feedback review data.
- Supabase migrations for growth funnel, tester activity and app feedback are mirrored in the repository.

## Current Premium pricing configuration

- Monthly: 1.99 EUR.
- Founders yearly: 14.99 EUR first year, first 100 claimed yearly subscribers.
- Early Access yearly: 17.99 EUR first year after Founders.
- Standard yearly: 19.99 EUR per year after Early Access.

The database remains the source of truth for Premium entitlement and offer state.

## Closed-test work now in progress

1. Have invited testers opt in, install from Google Play and use the app normally.
2. Collect real feedback on registration, location/Nearby, Active status, Cheers, chat, push notifications, profile editing and Premium presentation.
3. Watch crash/error metrics and tester activity in Founder App Health.
4. Put the installation counter and in-app feedback screen into the next closed-test build before relying on those new metrics.
5. Fix only confirmed regressions; avoid destabilizing the working version 8 unnecessarily.

## Before requesting / promoting Production access

- Confirm the required closed-testing participation period and tester threshold shown by the Play Console account.
- Complete/recheck Data Safety against the final build and SDK behavior.
- Confirm Account deletion declaration and public deletion URL.
- Complete Content Rating and adults-only Target Audience declarations.
- Configure and verify reviewer credentials in App access.
- Confirm support email and privacy-policy URL are current.
- Re-check store screenshots against the current UI.
- Run the exact production candidate through `npm run check`, `npm run release:audit` and Expo Doctor.
- Create a fresh production AAB and inspect the generated manifest/permissions.
- Perform a full Play-delivered physical-device smoke test before Production promotion.

## Android Premium release gate

The current Android release remains deliberately **consumption-only** for Premium. Keep it that way until a Google Play Billing / approved billing implementation is deliberately introduced and tested. Existing account entitlements may be displayed/unlocked, but the Play-distributed Android app must not accidentally expose the website Stripe checkout flow.

## R8 / optimization note

The Play Console optimization/disclosure warning seen on the uploaded bundle is not currently treated as a release blocker. Do not enable R8/obfuscation solely to silence that informational warning during the closed test. Revisit optimization only as a controlled release change with crash-symbol/mapping handling verified.

## GO / NO-GO rule

**Closed testing: GO.** Keep version 8 as the stable baseline while testers exercise it.

**Production: NO-GO until the closed-test requirement shown in Play Console is satisfied, declarations/reviewer access are complete, current CI is green, backend state matches the reviewed repository state, and the final Play-delivered candidate passes the physical-device smoke checklist.**
