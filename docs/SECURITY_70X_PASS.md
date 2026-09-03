# SipMate — 70x release hardening pass

Status snapshot: 3 September 2026

This is a repository-visible audit only. `PASS` means the checked source/config behavior is present in Git. `WARN` means the code is functional but deserves follow-up. `BLOCKER` means public release must wait for external/backend verification. Live Supabase policies, production secrets, EAS environment values and Play Console settings cannot be proven from repository source alone.

## Authentication and session boundaries

1. **PASS** Client Supabase URL comes from `EXPO_PUBLIC_SUPABASE_URL`.
2. **PASS** Client Supabase key comes from `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. **PASS** Native client does not reference the service-role key.
4. **PASS** Native client persists auth sessions.
5. **WARN** Native session persistence uses AsyncStorage; SecureStore-backed auth storage can be evaluated later for a stricter threat model.
6. **PASS** Web auth session persistence is enabled.
7. **PASS** Web URL session detection is enabled.
8. **PASS** Checkout requires an Authorization header.
9. **PASS** Checkout validates the session with Supabase Auth server-side.
10. **PASS** Customer Portal requires and validates the caller's session server-side.

## Secrets and credential exposure

11. **PASS** `.env.example` assigns only `EXPO_PUBLIC_*` client values.
12. **PASS** `.env.example` warns against service-role, Stripe and service-account secrets.
13. **PASS** Common Android signing-key formats are gitignored.
14. **PASS** Common Google service-account JSON names are gitignored.
15. **PASS** Local `.env` files are gitignored while `.env.example` stays tracked.
16. **PASS** Stripe secret usage is confined to Edge Functions in the reviewed source.
17. **PASS** Supabase service-role usage is confined to server-side Edge Functions in the reviewed source.
18. **PASS** Automated audit now fails on high-confidence `sk_live_`, `whsec_` and private-key signatures.
19. **PASS** Automated audit now fails if server-only environment variable names appear in `src/` client code.
20. **PASS** EAS configuration does not contain a committed `serviceAccountKeyPath`.

## Stripe and Premium backend

21. **PASS** Checkout accepts POST/OPTIONS only.
22. **PASS** Checkout validates request JSON.
23. **PASS** Checkout plan selection is allowlisted to monthly/yearly behavior.
24. **PASS** Checkout checks for an existing active subscription before creating another checkout.
25. **PASS** Checkout uses server-side Stripe credentials.
26. **PASS** Production checkout return origin is anchored to `APP_WEB_URL`.
27. **PASS** Arbitrary remote request origins are not trusted for checkout return URLs.
28. **PASS** Local checkout-origin fallback is restricted to localhost/127.0.0.1 development.
29. **PASS** Customer Portal lookup is scoped to the authenticated user's subscription row.
30. **PASS** Customer Portal production return origin is anchored to `APP_WEB_URL`.
31. **PASS** Webhook verifies Stripe signatures before processing events.
32. **PASS** Webhook supports separate signing secrets for event sources.
33. **PASS** Webhook recognizes only known Stripe Price IDs.
34. **PASS** Webhook requires Supabase user metadata on subscriptions.
35. **PASS** Webhook handles subscription update events.
36. **PASS** Webhook handles subscription deletion events.
37. **PASS** Webhook handles successful invoice renewal events.
38. **PASS** Webhook reconciles subscriptions by Stripe subscription ID.
39. **PASS** Webhook contains duplicate-row recovery behavior for unique conflicts.
40. **WARN** Client screens still rely on profile/subscription fields being protected by correct RLS; client UI is not an entitlement authority.

## Android billing/release isolation

41. **PASS** Android Premium route is separated into `premium.android.tsx`.
42. **PASS** Android Premium release-gate screen does not invoke Stripe checkout.
43. **PASS** Android Premium release-gate screen does not link directly to Stripe.
44. **PASS** Production Android build type is App Bundle.
45. **PASS** Development/preview Android builds use internal APK-style workflows.
46. **PASS** EAS requires committed Git state before builds.
47. **PASS** Google Play submit profile targets `internal`.
48. **PASS** Google Play submit profile uses `draft` release status.
49. **PASS** `changesNotSentForReview` remains enabled for controlled first submission.
50. **BLOCKER** Final Google Play Billing/eligible billing-choice implementation still needs production integration and test coverage before public Android Premium sales.

## Location, profile and media privacy

51. **PASS** Android app requests foreground coarse/fine location only.
52. **PASS** Background location is not configured.
53. **PASS** Microphone permission is explicitly blocked.
54. **PASS** Profile edit validates age range 18–120.
55. **PASS** Registration validates age range 18–120.
56. **PASS** Profile avatar/gallery object paths use the authenticated user ID prefix.
57. **PASS** Gallery-row deletion attempts matching Storage cleanup.
58. **PASS** Own-profile screen now selects only fields it renders instead of `select('*')`.
59. **PASS** Own-profile Premium badge now respects `premium_until` instead of trusting a stale `is_premium=true` alone.
60. **WARN** Nearby and some profile flows still use broad `select('*')`; reduce columns once the final public profile contract is fixed.

## Blocking, chat, Cheers and abuse controls

61. **PASS** Nearby filters users blocked in either direction.
62. **PASS** Nearby filters skipped profiles.
63. **PASS** Nearby renders only active profiles with usable location data.
64. **PASS** Chat checks `is_blocked_between` and disables composing when a block exists.
65. **WARN** Chat message INSERT security still depends on authoritative RLS/server rules; UI block state can never be the only enforcement.
66. **WARN** Cheers/Chats/deep-linked profile routes require blocked-user visibility tests so stale routes cannot bypass expected privacy semantics.
67. **WARN** Free-user received-Cheers identity hiding is currently presentation logic; if identity secrecy is a paid access-control promise, backend/RLS must avoid returning the hidden identity.
68. **PASS** Block-management UI scopes unblock requests using both blocker and blocked IDs.
69. **BLOCKER** Actual production RLS, helper functions, constraints and Storage policies are not version-controlled in this repository and must be exported/reviewed/tested before release.
70. **BLOCKER** Account deletion must remain disabled until subscription cleanup, database cleanup/cascades, Storage-prefix deletion, moderation-retention behavior and disposable-user end-to-end tests are all proven.

## Automation added during this pass

`scripts/security-audit.mjs` now performs repeatable repository checks for credential signatures, client references to server-only secret names, required public env placeholders, Android permission invariants, EAS submission safety settings, deletion safety-gate presence, Stripe return-origin protections, webhook signature verification and the Android Premium Stripe release gate.

`npm run check` now runs both TypeScript and the security audit, and GitHub Actions uses `npm run check`. The audit intentionally reports some lower-risk patterns as warnings instead of breaking the build; high-confidence secret/config regressions fail CI.

## Still outside repository proof

Before public release, verify the live Supabase project directly: RLS on every user-owned table, Storage policies for `avatars`, function secrets, database constraints/cascades, `is_blocked_between`, realtime visibility, Premium entitlement write restrictions and account deletion behavior. Also verify production EAS environment values, generated Android manifest permissions, Play Console declarations, billing and public privacy/deletion/support URLs.
