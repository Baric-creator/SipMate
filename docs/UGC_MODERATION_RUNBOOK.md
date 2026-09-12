# SipMate UGC Moderation Runbook

This runbook defines the operational process for reports, blocks and user-generated content before public launch.

## Scope

SipMate user-generated content includes profile names, bios, profile photos, chat messages and user interactions such as Cheers. Users can report and block other users from the app.

## Report states

The `reports.status` field supports:

- `pending` — waiting for review
- `reviewed` — reviewed and action taken or no further action required
- `dismissed` — report determined not actionable

Do not silently delete reports before review. Keep moderation decisions consistent and document repeat offenders outside the public client if needed.

## Daily launch-period review

During launch and early growth, check pending reports at least daily. Increase review frequency if user volume or report volume rises.

For every pending report:

1. Confirm the reported account still exists.
2. Review the report reason and any relevant profile content.
3. If needed, inspect recent conversation context only to the extent permitted by the privacy policy and applicable law.
4. Decide whether the report is actionable.
5. Apply the least severe effective action: warning/contact, content removal, temporary restriction, or account removal depending on severity and repeat behavior.
6. Mark the report `reviewed` after action or `dismissed` when no violation is found.

## Priority handling

Escalate immediately when a report concerns credible threats, coercion, stalking, sexual exploitation, child safety, doxxing, or imminent physical harm. Do not treat those as ordinary queue items.

For ordinary spam, fake profiles, harassment and inappropriate behavior, review promptly and look for repeat-report patterns.

## Blocking behavior expected in production

A block must prevent new Cheers, new conversations and new messages between the two accounts. The blocked pair should no longer appear together in Nearby results. Existing UI may remain visible temporarily, but database policy must reject further interaction.

## Privacy and access

Moderation access must be limited to the minimum people necessary. Never expose report data to the reported user through the client. Do not place service-role credentials, raw moderation exports or private message dumps in the public GitHub repository.

## Reviewer verification before release

Before every production promotion, create disposable test accounts and verify:

- report submission creates a pending report;
- the reported user cannot read the report;
- block hides the blocked account from discovery;
- blocked pairs cannot send Cheers or messages;
- moderation staff can identify pending reports and update their status through approved backend/admin tooling;
- account deletion removes or cascades report links associated with the deleted account as designed.

## Operational owner

The SipMate operator is responsible for the moderation queue until a dedicated moderation role or admin interface is introduced. If the queue cannot be reviewed reliably, public launch should be delayed or user growth temporarily limited.
