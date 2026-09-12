# SipMate Play Reviewer Smoke Checklist

Use this checklist on the final Internal Testing build before promoting any release.

## Account and access

1. Launch app from a clean install.
2. Verify Login, Create Account and Forgot Password screens open without layout issues.
3. Confirm registration rejects ages under 18.
4. Confirm registration requires acceptance of Terms of Use and Community Guidelines.
5. Sign in with the dedicated Play reviewer account.
6. Confirm reviewer can reach Discover, Nearby and Profile without special setup or MFA.

## Profile and location

1. Open Edit Profile.
2. Confirm location permission is requested only while using the app.
3. Confirm denial does not crash the app and the user is guided to set location later.
4. Confirm profile photo selection opens the system image picker and does not request camera/microphone access.
5. Confirm profile changes save and reload correctly.
6. Put the app in background for more than the presence timeout and confirm the user no longer appears online in Nearby.

## Cheers and chat

1. With two test accounts, send Cheers from account A to account B.
2. Confirm a duplicate Cheers does not create a duplicate row or duplicate UI state.
3. Send Cheers back from account B.
4. Confirm both accounts show mutual CHEERS and chat becomes available.
5. Open chat and send messages in both directions.
6. Confirm messages appear in realtime without refresh.
7. Confirm read receipts update after the recipient opens the conversation.
8. Confirm typing state appears and clears.
9. Put recipient app in background and send a message; confirm push notification arrives.
10. Tap the notification and confirm it opens the correct conversation.

## Safety and UGC

1. Open another user's profile.
2. Submit each report reason at least once in test data and confirm the report is stored without exposing it to the reported user.
3. Block a user and confirm they disappear from Nearby.
4. Confirm blocked users cannot create a new conversation, send Cheers, or send messages.
5. Confirm existing chat becomes unusable after a block and database policy rejects further sends.
6. Confirm Blocked Users screen can show the blocked account and unblock flow works if enabled for the release.

## Premium gate

1. Open Premium on Android.
2. Confirm pricing is visible.
3. Confirm there is no Stripe purchase button, external Stripe checkout, or web payment link in the Android build.
4. Confirm locked Premium-only UI routes to the Android Premium information screen rather than a web checkout.

## Password recovery

1. Request a reset email.
2. Open the recovery link on the Android test device.
3. Confirm the `sipmate://reset-password` deep link opens SipMate.
4. Set a new password with at least 8 characters.
5. Confirm the recovery session signs out after success and the new password works at Login.

## Account deletion

Use a disposable account only.

1. Open Profile -> Delete Account.
2. Confirm a destructive confirmation prompt appears.
3. Delete the disposable account.
4. Confirm the app returns to Login.
5. Confirm login with the deleted account no longer works.
6. Confirm profile, Cheers, reports/blocks, conversations/messages, uploaded profile photos and push-token linkage are removed or cascaded as designed.

## Release sign-off

Before promotion from Internal Testing:

- `npm run check` passes.
- `npm run release:audit` passes.
- `npm run doctor` passes.
- Final AAB permissions match the audited merged release manifest.
- Play Console Data Safety answers match production behavior.
- App access/reviewer credentials work from a fresh device.
- Privacy Policy, Terms, Community Guidelines and account-deletion URL are reachable publicly.
- No production Android flow exposes Stripe checkout for digital Premium.

Do not promote the build if any item above fails. Fix, rebuild, and rerun the checklist on the new AAB.
