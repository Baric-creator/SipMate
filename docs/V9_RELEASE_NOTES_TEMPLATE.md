# SipMate — V9 Release Notes Template

Use this file only when a real V9 candidate exists. Keep Play release notes focused on tester-visible changes and do not list internal-only refactors, secrets, infrastructure details or unverified fixes.

## Candidate metadata

- App version: `1.0.0`
- Android build/version code: `TBD`
- Release commit: `TBD`
- Closed Alpha track: `Alpha`
- Build date: `TBD`

## Fixes selected for V9

### P0 critical

- None selected yet.

### P1 high

- None selected yet.

### P2 normal

- None selected yet.

### P3 cosmetic

- None selected yet.

## Internal-only changes

Keep these out of the Play release notes unless they affect testers directly.

- Founder/App Health telemetry and triage improvements.
- Install first-launch tracking.
- Feedback severity/status workflow.
- Regression and release-check improvements.

## Play Console release notes — German

```text
<de-DE>
SipMate Alpha Update

- Stabilitätsverbesserungen und Fehlerbehebungen
- Verbesserungen basierend auf Tester-Feedback
- Weitere Optimierungen für Nearby, Cheers, Chat und Profile
</de-DE>
```

Replace the generic bullets with the exact tester-visible fixes before upload.

## Play Console release notes — English

```text
<en-US>
SipMate Alpha Update

- Stability improvements and bug fixes
- Improvements based on tester feedback
- Additional refinements to Nearby, Cheers, Chat and profiles
</en-US>
```

## Play Console release notes — Croatian

```text
<hr-HR>
SipMate Alpha ažuriranje

- Poboljšanja stabilnosti i ispravci grešaka
- Poboljšanja prema povratnim informacijama testera
- Dodatne dorade Nearby, Cheers, chata i profila
</hr-HR>
```

## Before publishing V9

- [ ] Every listed fix has been reproduced before the change.
- [ ] Every P0/P1 fix has been re-tested after the change.
- [ ] Release notes match the actual release candidate.
- [ ] `npm run check` passes on the exact commit.
- [ ] `npm run release:audit` passes.
- [ ] `npm run doctor` passes or warnings are explicitly accepted.
- [ ] Required production Supabase migrations/functions are deployed.
- [ ] Production database recovery/backup checks are complete.
- [ ] Android Premium remains consumption-only.
- [ ] AAB manifest/permissions are reviewed.
- [ ] Play-delivered candidate passes the physical-device smoke test.
