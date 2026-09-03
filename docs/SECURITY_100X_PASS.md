# SipMate — 100x deep release hardening pass

Status snapshot: 3 September 2026

Repository-visible review only. `PASS` means the checked source/config behavior is present in Git. `WARN` means follow-up is needed. `BLOCKER` means public release must wait for backend/account/store verification.

## CI and supply-chain controls

1. **PASS** Latest repaired workflow run completed successfully.
2. **PASS** CI installs dependencies with `npm ci`.
3. **PASS** CI runs TypeScript validation.
4. **PASS** CI runs the custom security audit.
5. **PASS** Security audit self-scan false positive was fixed without disabling repository scanning.
6. **PASS** High-confidence Stripe live secret signatures are scanned.
7. **PASS** Stripe webhook secret signatures are scanned.
8. **PASS** Private-key material signatures are scanned.
9. **PASS** Google service-account private-key material is scanned.
10. **PASS** Client source is checked for server-only environment variable names.
11. **WARN** Current `npm ci` audit output reports 14 moderate dependency vulnerabilities; do not use `npm audit fix --force` blindly on Expo dependencies.
12. **PASS** Weekly npm Dependabot monitoring is configured.
13. **PASS** Dependabot is limited to five simultaneous dependency PRs.
14. **PASS** Dependency update commits use a dedicated prefix.
15. **PASS** EAS builds require committed Git state.

## Client configuration and secrets

16. **PASS** Native Supabase URL is sourced from `EXPO_PUBLIC_SUPABASE_URL`.
17. **PASS** Native Supabase key is sourced from `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
18. **PASS** Web Supabase URL/key use the same public environment contract.
19. **PASS** Missing client Supabase environment variables fail fast.
20. **PASS** `.env.example` contains only public client assignments.
21. **PASS** Local `.env` files are gitignored.
22. **PASS** Android signing-key formats are gitignored.
23. **PASS** Google Play/service-account JSON naming patterns are gitignored.
24. **PASS** Service-role references remain server-side in reviewed code.
25. **PASS** Stripe secret-key references remain server-side in reviewed code.

## Authentication and session boundaries

26. **PASS** Native auth auto-refresh is enabled.
27. **PASS** Native auth persistence is enabled.
28. **PASS** Native URL session detection is disabled as expected for the native client.
29. **PASS** Web auth persistence is enabled.
30. **PASS** Web URL session detection is enabled.
31. **WARN** Native session storage currently uses AsyncStorage; SecureStore-backed session storage can be evaluated for a stricter threat model.
32. **PASS** Protected screens generally redirect or stop when no session exists.
33. **PASS** Checkout validates the caller server-side rather than trusting client identity fields.
34. **PASS** Customer Portal validates the caller server-side.
35. **PASS** Delete-account validates the caller before any destructive action.

## Stripe and Premium backend

36. **PASS** Checkout accepts only POST/OPTIONS.
37. **PASS** Checkout plan selection is allowlisted.
38. **PASS** Checkout checks existing active Premium state.
39. **PASS** Checkout uses server-side Stripe credentials.
40. **PASS** Production checkout redirects are anchored to configured `APP_WEB_URL`.
41. **PASS** Arbitrary remote browser origins are not trusted for payment return URLs.
42. **PASS** Development return-origin fallback is limited to localhost/127.0.0.1.
43. **PASS** Customer Portal accepts only POST/OPTIONS.
44. **PASS** Customer lookup is scoped to the authenticated user.
45. **PASS** Portal redirects are anchored to configured `APP_WEB_URL`.
46. **PASS** Stripe webhook signatures are verified.
47. **PASS** Webhook supports separate configured signing secrets.
48. **PASS** Webhook recognizes known Stripe Price IDs only.
49. **PASS** Webhook handles subscription update/delete and successful renewal events.
50. **PASS** Subscription reconciliation uses Stripe subscription IDs.
51. **WARN** Premium entitlement safety still depends on production RLS denying ordinary client writes to authoritative fields.
52. **PASS** Own-profile Premium badge now checks expiration, not only `is_premium`.
53. **PASS** Android Premium route does not invoke web Stripe Checkout.
54. **PASS** Android Premium route does not directly link to Stripe.
55. **BLOCKER** Final Google Play Billing/eligible alternative-billing implementation must be completed and tested before public Android Premium sales.

## Android and release configuration

56. **PASS** Android package is fixed to `com.bariccreator.sipmate`.
57. **PASS** Production Android build type is App Bundle.
58. **PASS** Development Android build is internal APK-style development client flow.
59. **PASS** Preview Android build uses internal distribution.
60. **PASS** Production EAS environment is explicitly selected.
61. **PASS** Google Play submit profile targets `internal`.
62. **PASS** First submit remains `draft`.
63. **PASS** `changesNotSentForReview` prevents accidental automatic review submission.
64. **PASS** Foreground coarse/fine location permissions are configured.
65. **PASS** Background location is not configured.
66. **PASS** Microphone permission is explicitly blocked.
67. **BLOCKER** Generated Android manifest must still be inspected because dependency manifests can add permissions.

## Profile, location and media privacy

68. **PASS** Registration enforces age 18–120 client-side.
69. **PASS** Edit Profile enforces age 18–120 client-side.
70. **PASS** Avatar object paths use the authenticated user's ID prefix.
71. **PASS** Gallery object paths use the authenticated user's ID prefix.
72. **PASS** Gallery-row deletion attempts Storage cleanup.
73. **PASS** Own-profile screen no longer uses broad `select('*')`.
74. **WARN** Nearby still uses broad profile reads and calculates distance client-side; final public profile/location column contract should be narrowed.
75. **WARN** User-profile flow still uses broad profile reads; narrow once the intended public fields are fixed.
76. **WARN** Edit-profile load still uses broad own-profile reads; lower privacy risk because it is the owner's row, but explicit fields are preferable.
77. **WARN** Public `avatars` URLs mean possession of the URL can expose the image; confirm this is the intended privacy model.
78. **BLOCKER** Storage policies must prove users cannot write/delete another user's prefix.

## Blocking, chat, Cheers and abuse controls

79. **PASS** Nearby removes users blocked in either direction.
80. **PASS** Nearby removes skipped profiles.
81. **PASS** Nearby shows only active profiles with usable location data.
82. **PASS** Chat invokes `is_blocked_between`.
83. **PASS** Chat hides composing UI when blocked.
84. **WARN** Chat currently uses broad message `select('*')`; select only rendered message fields in a future cleanup.
85. **WARN** Message INSERT security must be enforced by RLS; UI block state is not an authority.
86. **WARN** Read-receipt UPDATE must be restricted so users cannot mutate message ownership/content fields through permissive policies.
87. **WARN** Typing broadcast is client-generated; do not treat it as trusted identity or authorization data.
88. **WARN** Realtime message/profile subscriptions require verified RLS visibility and publication behavior.
89. **WARN** Chats list must be tested after blocking so stale conversations do not violate the intended privacy semantics.
90. **WARN** Cheers list must be tested after blocking so stale Cheers do not re-expose blocked identities.
91. **WARN** Deep-linked user profiles must be tested after blocking.
92. **WARN** Free-user received-Cheers identity hiding is currently client presentation; backend data minimization is required if the identity itself is a Premium secret.
93. **PASS** Block-management UI scopes unblock delete by both blocker and blocked IDs.
94. **WARN** Report ownership and moderation visibility must be enforced by RLS, not client code.

## Supabase and account deletion release gates

95. **PASS** A dedicated Supabase policy contract now documents required table, Storage and abuse-test behavior.
96. **BLOCKER** Production RLS policies are not version-controlled in this repository.
97. **BLOCKER** Production Storage policies are not version-controlled in this repository.
98. **BLOCKER** Account deletion remains deliberately disabled until subscription, DB, Storage and retention cleanup are proven.
99. **BLOCKER** Public external deletion-request resource and final support/privacy contact are still required before store publication.
100. **BLOCKER** Public release waits for live Supabase policy export/review/test, deletion end-to-end tests, Android billing completion, native manifest review and final Play Console declarations.

## Result of this pass

This pass also added weekly Dependabot npm monitoring and a concrete `SUPABASE_POLICY_REQUIREMENTS.md` contract so the later live-backend review has an explicit acceptance target rather than an informal checklist.

Do not turn any BLOCKER into PASS solely from repository inspection; those items require live Supabase, EAS, device or Play Console evidence.