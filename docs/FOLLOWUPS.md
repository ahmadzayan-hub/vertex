# VERTEX follow-ups

Known limitations that are not blockers today but should be planned in.
Items that have shipped are listed at the bottom with the changelog entry
that delivered them, so this file stays an accurate "what is left" list.

## Authenticated end-to-end tests (open, needs infrastructure)

**State.** `tests/e2e/happy-path.spec.ts` and `tests/fixtures/seed.sql`
exist (CHANGELOG 0.6.3). The spec is skipped unless the e2e environment
variables are set, so it has not run in CI. The public-path specs
(`landing`, `auth-gates`, `public-files`) run normally.

**What is still needed (owner action, not code).**

1. Provision a Supabase project `vertex-e2e` in the production region and
   apply all migrations in `supabase/migrations/`.
2. Load `tests/fixtures/seed.sql` (reviewer, admin, test project).
3. Add GitHub Actions secrets for the variables listed at the top of
   `tests/e2e/happy-path.spec.ts` (`E2E_SUPABASE_URL`,
   `E2E_SUPABASE_ANON_KEY`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`,
   `E2E_TEST_PROJECT_NAME`).
4. Add a teardown step that deletes seeded rows and storage objects after
   each run.

## Arabic PDF: automated text-layer assertion (open, small)

The Arabic font subset is embedded and lazy-loaded
(`services/pdf/arabicFont.ts`, shaping fix in PR #5), but there is still no
Playwright test that generates an Arabic report and asserts the PDF text
layer contains the Arabic string. Add one alongside the happy-path spec.

## Shipped (kept for reference)

| Item | Delivered in |
|---|---|
| Server-side file validation (Postgres trigger on `storage.objects`) | 0.6.3, migration `0003_server_upload_validation.sql` |
| Backup automation (nightly `pg_dump` + bucket mirror) | 0.6.3, `.github/workflows/vertex-backup.yml`; manual runbook in [`BACKUPS.md`](./BACKUPS.md) |
| Chart bundle split (recharts lazy chunk) | 0.6.3, `pages/analytics/AnalyticsCharts.tsx` |
| PDF Arabic font embedding | scaffold in 0.6.3; font subset embedded and lazy-loaded with RTL shaping in PR #5 |
| Authenticated e2e spec and seed fixtures | 0.6.3 (spec exists; running it is the open item above) |
