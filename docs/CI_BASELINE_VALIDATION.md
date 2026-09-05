# CI historical schema baseline

`20260901000000_ci_historical_schema_baseline.sql` reconstructs only the structural SipMate tables that existed before the repository began recording production hardening migrations.

It contains no production rows, secrets, billing activation, or deployment action. Its purpose is to let a fresh local Supabase instance replay the committed migration history and execute the pgTAP security contracts in CI.

Before this baseline is promoted beyond the isolated validation branch, clean replay and the complete database security contract suite must pass. Production remains unchanged.