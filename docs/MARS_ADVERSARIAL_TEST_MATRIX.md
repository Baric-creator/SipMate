# SipMate Mars Adversarial Test Matrix

Use disposable accounts and rollback transactions for destructive database probes. Never use real-user destructive tests.

| Area | Adversarial probe | Expected result |
|---|---|---|
| Profiles | Auth user selects blocked user's profile directly | denied/empty |
| Profiles | Auth user changes `is_premium` or `premium_until` | denied |
| Profiles | Age <18 or >120 | constraint failure |
| Profiles | Blank/oversized name | constraint failure |
| Profiles | Out-of-range coordinates | constraint failure |
| Nearby | Free user supplies custom origin | rejected/ignored by RPC contract |
| Nearby | Repeated nearby calls triangulate exact target | distance remains coarse; no raw target coords |
| Photos | Free user inserts gallery DB row | denied |
| Storage | Free user uploads `gallery-*` object | denied |
| Storage | User uploads into another UUID folder | denied |
| Storage | Arbitrary filename/MIME/oversized file | denied |
| Cheers | Self-Cheers | denied |
| Cheers | Free user reads received-only sender id | hidden |
| Cheers | Blocked pair sends/reads relationship | denied/hidden |
| Cheers | Spam over configured hourly limit | rate limited |
| Conversations | Nonmutual Free user creates conversation | denied |
| Conversations | Blocked pair creates conversation | denied |
| Messages | Recipient edits sender content | denied |
| Messages | Blank or >2000-char content | denied |
| Messages | Send without current mutual/Premium entitlement | denied |
| Messages | Spam over configured minute limit | rate limited |
| Realtime | Nonparticipant joins private typing topic | denied |
| Reports | Spoof another reporter id | server forces caller identity |
| Reports | Client sets reviewed/dismissed status | denied/server forces pending |
| Reports | Oversized details | denied |
| Reports | Spam over configured daily limit | rate limited |
| Premium | Expired `premium_until` with stale flag uses Premium RPC | denied |
| Premium | Free user adds seventh/any Premium gallery photo | denied |
| Stripe | Replay identical webhook event id | processed once |
| Stripe | Failed event retried | reclaimable after failure/stale policy |
| Stripe | Client reads webhook ledger | denied |
| Rate limit | Client reads/resets rate counters | denied |
| Delete account | Gate disabled | fail closed |
| Delete account | Disposable subscribed user deletion | Stripe cancellation then relational/auth cleanup |
| Anon | Direct public-table privileges | none except deliberately public surfaces |

## Release gate
A security-sensitive release is not ready if any deny-case unexpectedly succeeds, if raw target coordinates are exposed after the Phase C lock, or if a destructive test cannot be confined to disposable data.
