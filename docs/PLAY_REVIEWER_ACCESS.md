# SipMate — Google Play reviewer access

Use this checklist when filling Play Console → Policy and programs → App content → Sign-in details / App access.

Google Play reviewers must be able to sign in and reach all relevant app functionality without waiting for a one-time code, private invitation or another user's approval.

## Play Console selection

Choose that **all or some functionality is restricted by sign-in**.

## Reviewer account

Create and maintain one dedicated disposable reviewer/demo account in Supabase Auth.

Do not store its password in GitHub.

Before submission, verify that the account:
- is already confirmed and can sign in immediately
- does not require email confirmation during review
- does not require OTP, SMS, MFA or a magic link
- does not have an expiring password
- works from any country/location
- has a complete profile and profile photo
- is 18+
- can access Discover, Nearby, Profile, Community and Settings
- can send Cheers and use chat where test counterpart data exists
- can open Report and Block controls
- can access Privacy Policy, Terms / Community Guidelines and Delete Account

## Text to paste into Play Console — English

### Access instructions
1. Open SipMate.
2. Tap “Log in”.
3. Enter the reviewer email and password provided above.
4. After login, the main Discover screen opens.
5. Use the bottom navigation to access Discover, Nearby, Community and Profile.
6. Open a user profile to review Cheers, Block and Report controls.
7. Chat is available after a mutual Cheers. A prepared demo conversation/profile may be used for review.
8. Account and privacy controls are available from Profile / Settings, including account deletion.

No SMS code, MFA, invite code or location-dependent password is required for this reviewer account.

### Premium access note
If Premium features are enabled in the submitted build, the reviewer must be able to inspect them without making a real purchase. Use a preconfigured test entitlement/demo account or Google Play test billing as appropriate. Do not require the reviewer to pay.

## Final test before submission

On a physical Android device, sign out completely and test the exact credentials you will paste into Play Console.

Verify this path:

Login → Discover → Nearby → Profile → open another profile → Cheers → Chat/demo conversation → Report → Block → Settings → Privacy / Terms → Delete Account screen.

If any step fails, fix the reviewer account before sending the app to review.

## Important

- Keep the reviewer account active for the entire review period and for later update reviews.
- If its password changes, update Play Console immediately.
- Never use a real user's personal account as reviewer credentials.
- Never commit reviewer passwords, OTP secrets or recovery codes to this repository.
