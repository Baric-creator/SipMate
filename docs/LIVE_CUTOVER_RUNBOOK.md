# SipMate LIVE cutover runbook

This runbook separates additive preparation from the two final privacy cutover migrations. Do not merge or apply the final cutover while Google/Play verification or release-client validation is still pending.

## Phase A — preparation only

Apply and validate the additive/private-media preparation migrations through:

- `20260904192000_add_private_media_paths.sql`
- `20260904193500_prepare_private_avatar_storage_policy.sql`
- `20260904195000_reassert_stripe_webhook_rpc_caller_identity.sql`
- `20260904195100_allow_client_private_media_path_writes.sql`
- `20260904195200_restrict_private_media_paths_to_approved_names.sql`

Stop before the final release cutover migrations. At this point the avatars bucket remains public and legacy clients continue to work.

Required checks before continuing:

- clean migration replay succeeds
- database security contracts pass
- release preflight succeeds
- every SipMate Storage avatar/gallery URL has a canonical private path
- every referenced private path exists in `storage.objects`
- hardened client renders Nearby, UserProfile, Chat, Chats and Edit Profile media through the private-media boundary
- JPG/JPEG, PNG and WebP uploads succeed; unsupported formats are rejected before upload

## Phase B — hardened client validation

Build/test the hardened client before changing LIVE privacy boundaries.

Device smoke checks:

1. Sign in and sign out.
2. Nearby loads profiles and avatars.
3. User Profile loads avatar, gallery and fullscreen photo.
4. Chat header avatar loads; realtime messages, read state and typing still work.
5. Mutual Cheers still produces CHEERS.
6. Blocking hides/denies the expected profile/chat paths.
7. Edit Profile can replace an avatar and add/delete Premium gallery photos.
8. A rejected/failed upload does not leave a new database reference behind.
9. Premium status/filter behavior remains unchanged.

Do not proceed if the tested client still contains raw public-URL profile-media rendering.

## Phase C — final privacy cutover

Only after explicit approval, apply the final migrations in order:

1. `20260905142000_lock_direct_profile_reads_to_owner.sql`
2. `20260905142100_cutover_avatars_bucket_private.sql`

The bucket migration is fail-closed and must abort if its helper/policy/backfill/object prerequisites are not satisfied.

## Immediate post-cutover verification

Confirm:

- `storage.buckets.public = false` for `avatars`
- `Public avatar read` no longer exists
- `Authenticated avatar read` exists
- direct profile/profile-photo SELECT policies are owner-only
- Nearby/UserProfile/Chat media still loads from the released client
- no spike in Storage authorization, profile RPC, chat, Cheers or upload failures

## Rollback boundary

Do not automatically weaken privacy controls on failure. Stop traffic/release promotion first and identify whether the failure is client, path backfill, Storage policy or object consistency. Any rollback that re-enables public media or cross-user direct profile reads requires explicit production approval.
