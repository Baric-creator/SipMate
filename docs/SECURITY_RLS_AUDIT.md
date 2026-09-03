# SipMate — Supabase security / RLS release audit

Status snapshot: 3 September 2026

This document records repository-visible security checks for the SipMate MVP. It does not claim that the live Supabase project has matching policies: the repository currently contains Edge Functions and `supabase/config.toml`, but no version-controlled database migration/policy files. Production RLS and Storage policies must therefore be inspected in Supabase before release.

## Release blockers

1. **RLS definitions are not version-controlled.** The app directly accesses `profiles`, `profile_photos`, `cheers`, `conversations`, `messages`, `blocks`, `reports`, `skipped_profiles`, `premium_subscriptions` and `premium_offers`. Every user-owned table needs verified production RLS.
2. **Account deletion remains intentionally disabled** unless `ACCOUNT_DELETION_ENABLED=true`. Do not enable it until database rows, Storage objects, moderation-retention rules and paid subscriptions are tested end to end.
3. **Account deletion must remove Storage objects.** Avatar/gallery objects are stored in the public `avatars` bucket under a user-ID path. Deleting only the Auth identity is insufficient.
4. **Paid subscriptions must be handled before identity deletion.** A deleted Auth account must not leave an active recurring subscription behind.
5. **Public deletion request resource and support/privacy contact are still required before store publication.**

## Required table-policy behavior

### profiles
- Authenticated users may read only profile fields intentionally exposed by the product.
- A user may update only their own profile row (`auth.uid() = id`).
- Client code must never be able to set authoritative Premium entitlement fields unless a trusted backend is responsible for them.
- Location fields deserve special review because `Nearby` currently reads profile rows client-side and calculates distance locally.

### profile_photos
- Authenticated users may read photos allowed by product visibility rules.
- A user may insert/delete only rows where `user_id = auth.uid()`.
- Premium photo limits must not rely only on client UI; server-side policy/constraint or trusted backend enforcement is required if the limit is security/business critical.

### cheers
- A user may insert only a row with `sender_id = auth.uid()`.
- A user must not Cheers themselves.
- Duplicate `(sender_id, receiver_id)` rows should be prevented by a unique constraint.
- Reads should expose only Cheers in which the current user is sender or receiver.
- Blocking must prevent new Cheers in either direction if blocking semantics require total contact prevention.

### conversations
- Reads must be limited to rows where the current user is `user_one` or `user_two`.
- Inserts must include the current user as one participant.
- A canonical participant-order constraint should keep `(user_one, user_two)` unique and prevent duplicate conversations.
- If chat is intended to require mutual Cheers, conversation creation must enforce that on the server rather than only in UI.
- Blocking should prevent new conversation creation.

### messages
- Reads must be limited to members of the referenced conversation.
- Inserts must require `sender_id = auth.uid()` and membership in the referenced conversation.
- Updates to `read_at` must be limited so a conversation member cannot arbitrarily rewrite message content/sender/ownership fields.
- Blocking should prevent new messages in either direction.
- Realtime publication must not become a bypass around the same row visibility rules.

### blocks
- A user may create a block only with `blocker_id = auth.uid()`.
- A user may delete only blocks they created.
- Duplicate pairs should be prevented.
- Self-blocking should be prevented.
- Reads should reveal only block rows necessary for the current user's own block logic.

### reports
- A user may insert a report only with `reporter_id = auth.uid()`.
- Ordinary users should not be able to read other users' reports or moderation data.
- Ordinary users should not be able to alter report ownership/status/moderation fields after submission unless explicitly intended.
- Decide and document whether reports are retained after account deletion for safety/legal reasons.

### skipped_profiles
- A user may read/insert/delete only rows where `user_id = auth.uid()`.
- Duplicate `(user_id, skipped_user_id)` rows should be prevented.

### premium_subscriptions
- Client reads should expose only the current user's entitlement data.
- Client writes should be denied; Stripe/Play billing backend logic should own authoritative subscription state.
- Stripe customer/subscription identifiers should not be broadly readable by other users.

### premium_offers
- Authenticated clients may need read-only access to active public offer metadata.
- Client writes should be denied.

## Storage policy checks for `avatars`

- Upload/update/delete must be restricted to object paths owned by the authenticated user, currently using a `<user-id>/...` convention.
- Verify users cannot overwrite or delete another user's avatar/gallery objects by crafting a path.
- Verify allowed MIME types and practical upload-size limits.
- Decide whether public-read URLs are acceptable for profile photos. If not, use a private bucket/signed URLs and update the app accordingly.
- Account deletion must enumerate and remove the user's entire prefix, not only the current avatar row.

## Edge Function checks

### create-checkout-session
- Requires an Authorization header and validates the user with `auth.getUser()`.
- Rejects unsupported HTTP methods and invalid request bodies/plans.
- Prevents creating another checkout when an active Premium row already exists.
- Uses server-only Stripe credentials.
- Production return URLs are now anchored to `APP_WEB_URL`; arbitrary remote request origins are not accepted as Stripe return destinations. Only localhost/127.0.0.1 can be used as a development fallback.

### create-customer-portal
- Requires and validates the caller's Supabase session.
- Uses service-role access only on the server to locate the caller's Stripe customer record.
- Production portal return URL is anchored to `APP_WEB_URL`; arbitrary remote request origins are not accepted. Only localhost/127.0.0.1 can be used as a development fallback.

### stripe-webhook
- Verifies Stripe signatures before processing events.
- Supports separate webhook signing secrets for checkout/subscription event sources.
- Uses the service-role key only server-side.
- Subscription rows are reconciled by Stripe subscription ID and handle duplicate insert races.
- Before production, return generic external error bodies and keep detailed provider/database errors only in server logs.
- Confirm required secrets exist before constructing provider clients.

### delete-account
- Validates the caller through Supabase Auth.
- Service-role deletion is server-side only.
- Destructive deletion remains behind `ACCOUNT_DELETION_ENABLED=true`.
- Current implementation deletes the Auth user only after the safety gate. Do not enable the gate until explicit/cascading DB cleanup, Storage cleanup and subscription cleanup are proven.

## Client privacy / abuse checks

- Nearby filters block relationships in both directions before rendering discovery results.
- Chat checks `is_blocked_between` and hides the composer when blocked; server policies must remain the authoritative enforcement.
- Blocked-users UI only requests blocks created by the current user and deletes using both blocker and blocked IDs; RLS must enforce ownership regardless of client filters.
- Cheers, Chats and direct profile routes should be tested for blocked-user visibility so a block cannot be bypassed through a stale/deep-linked screen.
- Received-Cheers identity hiding for Free users is currently a client presentation feature; if Premium reveal is meant to be access control rather than merchandising UI, the backend must not return the hidden identity to Free clients.
- Premium entitlement and Premium limits must be enforced by trusted data/policies, not only React state.

## Authentication / device storage checks

- Native Supabase session persistence currently uses AsyncStorage. This is functional, but evaluate whether the production threat model warrants a SecureStore-backed auth storage adapter.
- Web auth uses URL session detection as expected for browser auth flows.
- `.env.example` contains only public client configuration placeholders and warns against server secrets.

## Android privacy checks

- App config requests foreground coarse/fine location only.
- Background location is not configured.
- Microphone permission is explicitly blocked.
- Inspect the generated production Android manifest because dependency manifests can add permissions not obvious from `app.json`.

## 50-point verification pass

1. Auth required for checkout.
2. Checkout user token validated server-side.
3. Checkout POST-only.
4. Checkout request body validation present.
5. Checkout plan allowlist present.
6. Duplicate active subscription guard present.
7. Stripe secret remains server-side.
8. Checkout remote-origin redirect removed.
9. Checkout localhost development fallback constrained.
10. Checkout missing production origin fails closed.
11. Portal auth required.
12. Portal user token validated server-side.
13. Portal POST-only.
14. Portal service-role key remains server-side.
15. Portal customer lookup is scoped to authenticated user ID.
16. Portal remote-origin redirect removed.
17. Portal localhost development fallback constrained.
18. Portal missing production origin fails closed.
19. Webhook signature verification present.
20. Webhook supports two configured signing secrets.
21. Webhook recognizes known Stripe Price IDs only.
22. Webhook subscription metadata requires Supabase user ID.
23. Webhook handles subscription updated events.
24. Webhook handles subscription deleted events.
25. Webhook handles successful invoice renewal events.
26. Webhook reconciles by Stripe subscription ID.
27. Webhook handles unique-conflict retry/update path.
28. Delete-account caller token validated.
29. Delete-account service-role key remains server-side.
30. Delete-account destructive gate present.
31. Auth user is not deleted while gate is disabled.
32. Account-deletion Storage cleanup still needs proof.
33. Account-deletion DB cascade/explicit cleanup still needs proof.
34. Account-deletion paid-subscription cleanup still needs proof.
35. Public external deletion-request resource still needed.
36. Privacy/support contact still needed.
37. Nearby removes users blocked in either direction.
38. Nearby removes skipped profiles.
39. Nearby only renders active profiles with location.
40. Chat performs blocked-between check.
41. Message send identifies RLS denial as a blocked/permission case in UI.
42. Blocked-users deletion scopes both blocker and blocked IDs.
43. Registration validates 18–120 client-side.
44. Profile editing validates 18–120 client-side.
45. Avatar/gallery paths use the authenticated user's ID prefix.
46. Gallery DB row cleanup attempts Storage cleanup.
47. Android permissions are foreground location only in app config.
48. Microphone permission is blocked.
49. Client environment example contains no server secret placeholders.
50. Database RLS/Storage policy source is missing from Git and remains a production verification blocker.

## Before enabling production deletion or public release

Export or create migrations for the actual Supabase schema, constraints, RLS policies, helper functions (including `is_blocked_between`) and Storage policies. Review those files in Git, test them with disposable users, then make the production project match the reviewed version. Until that exists, repository review alone cannot prove live data isolation.
