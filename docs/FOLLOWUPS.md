# VERTEX follow-ups

Known limitations that are not blockers today but should be planned in.

## PDF Arabic font embedding

**What it is now.** `services/pdf/index.ts` calls jsPDF with the built-in
`helvetica` font. Arabic strings render with glyph substitution: the
letters are drawn but shaping and ligatures are wrong, and lines do not
reflow right to left.

**Why we did not solve it in-tree.** Embedding an Arabic font into a
browser-side PDF means shipping a subset of Noto Sans Arabic
(~120 KB minified base64) alongside the pdf chunk. That doubles the
gzipped size of the pdf chunk and there is no benefit for the ~70% of
reports today that are English-only.

**The plan.**

1. Add a Vite plugin that ships two PDF entry points: `pdfEn.ts` (helvetica,
   current behaviour) and `pdfAr.ts` (adds the base64 Noto subset on
   `doc.addFileToVFS` + `doc.addFont` + `doc.setFont('NotoSansArabic')`).
2. Change `Reports.tsx` to load the right entry conditionally based on
   `language`. Both entries share the same drawer.
3. Add a Playwright test that generates a report in Arabic and asserts
   the rendered PDF's text layer contains the Arabic string.

Subset generation script (run once, commit the resulting `.js` shim):

```bash
npx pyftsubset NotoSansArabic-Regular.ttf \
  --unicodes-file=vertex-arabic-subset.txt \
  --output-file=NotoSansArabic-VertexSubset.ttf
npx jspdf-fontconverter NotoSansArabic-VertexSubset.ttf normal
```

Owner: TBD. Ship in v0.7.0.

## Authenticated end-to-end tests

**What it is now.** `tests/e2e/*.spec.ts` cover the public path only:
Landing renders, `/dashboard` redirects to `/login` without a session,
the login form validates. There is no e2e that logs in, uploads a real
submission, runs analysis, and asserts findings appear.

**Why we did not solve it in-tree.** Real e2e needs a dedicated Supabase
project (test env) with a seeded user, a service-role key stored in
GitHub Actions secrets, and a teardown step that wipes rows after the
run. That is real infrastructure, not one commit.

**The plan.**

1. Provision a Supabase project `vertex-e2e` in the same region as
   production. Apply both migrations.
2. Seed one admin user, one reviewer user, one project, and one
   submission via a fixtures SQL file committed under
   `tests/fixtures/seed.sql`.
3. Add three GitHub Actions secrets:
   `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, `E2E_TEST_PASSWORD`.
4. Add `tests/e2e/happy-path.spec.ts` that:
   - Logs in as reviewer.
   - Visits `/dashboard`, expects the seeded project's row.
   - Visits `/upload`, walks the wizard end to end.
   - Waits for the findings badge on the resulting submission page.
   - Approves. Expects `submission.approvalStatus.approved` visible.
5. Add a teardown step that deletes seeded rows and storage objects.

Owner: TBD. Ship in v0.7.1.

## Server-side file validation

Client-side `validateFile` in `services/storage.ts` blocks non-allowlisted
MIME and files over 25 MB. This is enough to keep casual mistakes out but
not enough to keep a determined bad actor from bypassing the browser and
posting directly to Supabase Storage. Add a Postgres trigger or an Edge
Function on the bucket that re-validates content-type + size on write.
Ship in v0.7.0.

## Backup automation

Manual runbook is at [`BACKUPS.md`](./BACKUPS.md). Once VERTEX has real
production data, wire the nightly mirror through GitHub Actions (or a
Supabase Cron) rather than trusting a human to run it.

## Bundle chart family split

`charts` is 108 KB gzip because recharts pulls in the entire d3 module
graph. If the Analytics page ever ships without a couple of chart
types, dynamically import only what each page uses.
