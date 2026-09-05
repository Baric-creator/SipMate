# SipMate Mars Release Security Sequence

This checklist deliberately separates safe backend hardening from client-dependent privacy locks.

## Phase A — safe before client rollout
- Keep RLS enabled on every exposed table.
- Keep anon table privileges minimized.
- Keep server-managed Premium fields protected from client writes.
- Keep Cheers sender privacy, chat entitlement, message column grants, report identity/status protection, social-action rate limits, Stripe webhook event ledger, and private Realtime typing authorization enabled.
- Keep avatar/gallery upload path validation and Premium gallery limits enabled.

## Phase B — ship the privacy-RPC client
The release client must use:
- `get_public_profile` for another user's profile.
- `get_profile_photos` for another user's gallery.
- `get_nearby_profiles` for discovery/distance.
- `get_cheers_relationship` / `get_cheers_overview` for Cheers state.
- `get_chat_list` for chat summaries.
- private Realtime channels for typing broadcasts.

Regression gate before Phase C:
1. Nearby discovery works for Free and Premium.
2. Custom location works only for active Premium.
3. Public profile opens from Nearby, Cheers and Chat.
4. Gallery loads for an unblocked target.
5. Blocked users cannot see each other's profile/gallery.
6. Free users cannot identify received-only Cheers senders.
7. Mutual Cheers still unlocks chat.
8. Active Premium can initiate direct chat.
9. Expired Premium cannot use Premium-only capabilities.
10. Existing conversations remain readable while new message sends still enforce current entitlement.

## Phase C — final coordinate/privacy lock (DELAYED)
Only after the Phase B client is distributed and old incompatible clients are outside the supported rollout window:
- Restrict direct `profiles` SELECT to the caller's own row.
- Restrict direct `profile_photos` SELECT to the caller's own rows.
- Continue serving other-user data only through the privacy RPCs.

Do not apply this lock early: old clients can still depend on direct nonblocked profile/photo reads, and direct profile rows currently include exact latitude/longitude.

## Phase D — media privacy migration (separate release)
The `avatars` bucket is currently public. Public object URLs remain retrievable by anyone who knows the URL. A private-bucket migration therefore requires a coordinated client rollout using signed URLs or an authenticated media endpoint. Do not flip the bucket to private in isolation.

## Phase E — release/account gates
- Run disposable-user account-deletion E2E before enabling the production deletion gate.
- Confirm Stripe subscription cancellation/deletion behavior with disposable/test data only.
- Confirm Android Premium remains disabled until Google Play Billing is implemented.
- Enable leaked-password protection in Supabase Auth when the project plan/account supports it.

## Rollback rule
Every release phase must be independently reversible. Never weaken RLS or expose raw coordinates/public server-only ledgers merely to preserve an old client. If compatibility blocks Phase C, keep Phase C delayed and ship the compatible client first.
