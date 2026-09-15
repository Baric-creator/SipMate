# SipMate Discord 25 Crew Challenge

## Public offer

Bring **25 verified new members** to the official SipMate Discord community and receive **12 months of SipMate Premium** on the qualifying participant's SipMate account.

Public campaign page: `https://officialsipmate.com/discord-giveaway.html`

## Initial operating flow

1. Participant joins the official SipMate Discord.
2. Participant opens a referral/support ticket and requests a campaign invite.
3. Staff assigns or records a unique Discord invite for that participant.
4. The participant shares only that tracked invite for this challenge.
5. Once the invite reaches 25 candidate joins, staff validates the referred members.
6. Staff confirms the participant has linked the intended Discord identity to the intended SipMate account.
7. A trusted backend/service-role workflow calls `public.grant_premium_reward` for 365 days.
8. Staff records the result in the ticket and, when Discord role automation is available, confirms the Premium Discord role.

## Validation rules

Count only unique genuine new community members. Exclude self-invites, alternate accounts, obvious bots, duplicate identities and join/leave spam. Suspicious bursts or coordinated abuse should be reviewed before a reward is granted.

Do not award from a Discord display name alone. Use the stable Discord user ID and the SipMate profile linkage before granting Premium.

## Reward identity and idempotency

Use a stable campaign source such as:

`discord_25_crew`

Use a unique external reference that identifies one qualifying reward event, for example:

`discord_25_crew:<discord_user_id>:2026-launch`

The database enforces uniqueness across `source + external_reference`, so retrying the same completed reward must not add another year.

## Premium behavior

The reward is 365 days. If the user has an active finite Premium entitlement, the year is added after the current expiry. If the user's Premium is expired, the year starts from the grant time. Legacy lifetime Premium (`premium_until = null` while Premium is active) must never be shortened or replaced by a finite reward.

## Before automating with the Discord bot

Keep the first campaign manually verified. Once the invite-count behavior and abuse rules are proven in real use, automate only the deterministic parts: invite ownership, join tracking, threshold detection, Discord/SipMate identity mapping and the trusted reward grant. Do not put a service-role key in the Discord client, mobile app or public website.

## Campaign changes

If the public rule changes from “every qualifying participant” to “first N winners only,” update the website and Discord announcement before accepting entries under the new rule. Record a start/end time or capacity in the campaign announcement so participants can tell which rules applied when they entered.
