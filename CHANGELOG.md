# VERTEX changelog

Notable changes to the VERTEX platform. Semantic versioning
(major.minor.patch) once we cut a 1.0.0 tag.

## 0.6.3 - Follow-ups sweep

Shipped every remaining FOLLOWUPS item that can land without
production data or paid external accounts.

- Server-side upload validation. Migration
  `0003_server_upload_validation.sql` installs a `BEFORE INSERT OR
  UPDATE` trigger on `storage.objects` that rejects writes to the
  `submissions` bucket when the MIME type is not in the allowlist or
  the file is over 25 MB. Client-side `validateFile` is now a UX
  hint; this is the hard boundary.
- Backup automation. `.github/workflows/vertex-backup.yml` runs
  nightly at 22:00 UTC (02:00 UAE), takes a `pg_dump` and a
  `submissions` bucket mirror, and uploads both as workflow
  artefacts with 30-day retention. Uses three repository secrets:
  `VERTEX_SUPABASE_ACCESS_TOKEN`, `VERTEX_SUPABASE_PROJECT_REF`,
  `VERTEX_SUPABASE_DB_PASSWORD`.
- Chart bundle split. `pages/analytics/AnalyticsCharts.tsx` extracts
  every recharts widget into its own lazy chunk. The Analytics page
  now renders the four KPI cards from its own tiny chunk and only
  pulls the 110 KB gzip `charts` chunk once the user is looking at
  the numbers.
- PDF Arabic font scaffold. `services/pdf/arabicFont.ts` registers a
  base64-encoded Noto Sans Arabic subset on demand via jsPDF's VFS +
  `addFont`. `generateSubmissionReport` and `generateProjectReport`
  now take a `language` and pick the right font via `pickFontFor`.
  The base64 payload is empty by default (English reports carry no
  extra bytes); drop the subset in and Arabic reports switch to
  proper shaping. Instructions inside the file.
- Authenticated e2e scaffold. `tests/e2e/happy-path.spec.ts` is
  skipped by default and enables itself when the four e2e env
  variables are set. It logs in as a seeded reviewer, walks the
  four-step upload wizard, waits for the traffic-light chip, and
  approves. `tests/fixtures/seed.sql` defines the reviewer + admin
  users + test project. Setup steps in `docs/FOLLOWUPS.md`.

## 0.6.2 - Hardening round 2

Follow-up from the audit list. Every item is a real defence-in-depth
change, not cosmetics.

- CSP is tighter. `img-src` is now `'self' data: blob:
  https://*.supabase.co` (was any HTTPS). `connect-src` dropped
  `https://api.anthropic.com` and `https://api.openai.com` since real
  provider calls go through the Supabase Edge Function; the browser
  no longer needs a hole to reach the AIs directly.
- Edge Function `analyze-submission` now rate-limits at 5 analyses
  per rolling minute per user id (falls back to client IP without a
  JWT). Excess requests get a 429 with a `Retry-After` header.
- Bundle size regression gate at `scripts/bundle-size-check.mjs`
  runs in CI (`npm run bundle:check`) right after `npm run build`.
  Each chunk family (index / react / router / i18n / supabase /
  charts / pdf / plus every per-page lazy chunk) has an explicit
  gzip ceiling. A careless dependency import fails the check
  instead of silently shipping 200 KB gzip.
- `docs/BACKUPS.md` documents daily managed backups, weekly manual
  `pg_dump`, nightly storage mirror, the restore drill, and
  retention.
- `docs/FOLLOWUPS.md` lists PDF Arabic font embedding, authenticated
  e2e, server-side upload validation, backup automation, and chart
  bundle split with explicit owners and target versions.
- `tsconfig.json`: `ignoreDeprecations: "5.0"` so the build survives
  TypeScript 7's deprecation warning on `baseUrl`.

## 0.6.1 - Quality pass

Targeted fixes after a full audit.

- `useSubmission` realtime: debounce reloads with a 250 ms trailing
  timer so a burst of postgres_changes events (e.g. the analyzer
  inserting five findings at once) collapses to a single reload
  instead of five parallel three-select round-trips.
- `useKpiTracking`: replace `new Date().toISOString().slice(0, 7)`
  with local `getFullYear/getMonth` so a UAE user at 03:00 local time
  is not shifted into last month's bucket because UTC has already
  rolled over.
- `NotFound` page: parity with the rest of the app - skip link,
  header with Logo + LanguageSwitcher, semantic `<main id="main">`,
  and a smart Go-home link (`/dashboard` when authenticated,
  otherwise `/`).
- Component tests: `SeverityBadge` and `StatCard` under
  `tests/unit/*.test.tsx` (44/44 unit tests total).
- Vitest config: pin `react` / `react-dom` / `react-i18next` /
  `i18next` / `react-router-dom` to `vertex-platform/node_modules`
  via aliases + `server.deps.inline` so a duplicate React copy in the
  repo root does not break hooks in tests.
- `.env.example`: dropped `VITE_CLAUDE_API_KEY` (would leak into the
  browser bundle). Documented `VITE_AI_PROVIDER` (`mock` or `edge`)
  and pointed provider secrets at Supabase.

## 0.6.0 - Testing suite - vitest + Playwright

- Vitest is wired with jsdom, coverage via v8, and a light setup file
  that shims `window.matchMedia`.
- 30 unit tests across four suites cover the pure logic:
  `formatters` (currency, date, percent, relative, email and password
  validation), `mock-analyzer` (determinism, output shape), `storage`
  (MIME + size validation, byte formatting, path sanitisation),
  `dashboard-stats` (traffic-light thresholds).
- Playwright is wired against a pre-installed Chromium via
  `PLAYWRIGHT_CHROMIUM_PATH` in local dev, or `npx playwright install
  --with-deps chromium` in CI.
- 15 e2e tests cover: landing page rendering + language toggle to RTL,
  auth gates + form validation for email + password policy, and the
  eight public discoverability files each returning 200 with the right
  content type.
- npm scripts added: `test`, `test:watch`, `test:coverage`, `e2e`,
  `e2e:install`.
- GitHub Actions workflow split into two jobs: `quality` (typecheck,
  lint, unit tests, build, dist artefact) and `e2e` (installs
  Playwright + Chromium, runs the browser suite, uploads the HTML
  report on failure).
- `.gitignore` adds coverage, playwright-report, test-results.

## 0.5.0 - Session 6 - analytics + PDF reports

- `/analytics` - portfolio wide view. Four summary cards (portfolio
  compliance, findings 30d, open obligations, active insurance),
  compliance by project bar chart (top 12), findings by type donut,
  findings by severity bar chart, findings per week line chart (12
  weeks).
- `/reports` - generate PDF for a submission or a project. jsPDF +
  jspdf-autotable. Every generation writes an audit_log entry.
  - Submission report: header stripe with the VERTEX mark, submission
    meta table, findings table grouped by severity with clause refs
    and evidence quotes.
  - Project report: header stripe, contract meta, submissions table,
    obligations table, KPI penalties table, insurance table.
- `useAnalytics` hook rolls up submissions, ai_findings, obligations,
  insurance in a single pass (five parallel Supabase queries).
- vite manualChunks isolates jspdf into its own chunk so it only
  streams on `/reports`.
- Sidebar shows Analytics and Reports; command palette lists both.

## 0.4.0 - Session 5 - KPI, obligations, insurance

Three new pages that turn VERTEX from a submission review app into an
operational contract control tower.

- `/kpi` - KPI tracker. Filter by project and window (3, 6, 12 months),
  summary cards (this month, window total, open for approval, contract
  KPI cap), penalty trend bar chart, full penalty table with per-row
  admin approval and audit entries on approve or revoke.
- `/obligations` - obligations grouped into four buckets (overdue,
  at risk, on track, complete). Filter by project and type
  (deliverable, payment, renewal, approval, compliance). Each row shows
  description, project, type, due date, days remaining, critical path
  chip, and the associated KPI leverage.
- `/insurance` - insurance renewals grouped by bucket (expired,
  expiring within 30 days, active, renewed). Upload evidence in place;
  the file lands in the `submissions` bucket at
  `<project_id>/insurance/<policy_id>/<file>`, `renewal_evidence_url`
  is patched, `renewal_status` becomes `renewed`, and an audit entry
  is written.
- Hooks: `useKpiTracking`, `useObligations`, `useInsurance` (with
  `uploadEvidence`).
- Types: `KpiRecord`, `Obligation`, `InsurancePolicy`, plus enums
  `ObligationType`, `ObligationStatus`, `RenewalStatus`.
- Locales: `kpiPage`, `obligationsPage`, `insurancePage` sections
  added in EN and AR with formal Arabic register.
- Sidebar shows the three new destinations. Command palette lists them
  in the static route hits.
- Every new page is `React.lazy`. Bundle sizes on load:
  KpiTracker 2.8 KB gzip, Obligations 1.9 KB gzip, InsuranceRenewals
  2.2 KB gzip.

## 0.3.0 - Hardening

Performance, resilience, and operations.

- Code splitting: every authenticated route is `React.lazy`. Initial JS
  bundle drops from a single 924 KB blob to a landing shell plus
  vendored chunks (React, router, i18n, Supabase, charts) that stream in
  on demand.
- Manual chunks in `vite.config.ts` isolate the biggest deps so the
  landing page ships around 100 KB gzipped.
- Realtime: `useSubmission` subscribes to Supabase `postgres_changes`
  for submissions, ai_findings, and comments filtered to the current
  submission id. The tab updates without a refresh when analysis
  completes, a comment lands, or another reviewer approves.
- Global command palette (`Cmd K` / `Ctrl K`): fuzzy search across
  routes, projects (by name and contract ref), and submissions (by
  document name). Debounced Supabase queries; keyboard nav.
- Skeleton loaders replace the spinner on the Dashboard so the shape of
  the page appears immediately.
- Root `ErrorBoundary` wraps the whole app so a single component throw
  does not blank the screen; users see a friendly recovery card.
- Security headers on Vercel: HSTS, X-Content-Type-Options, X-Frame,
  Referrer-Policy, Permissions-Policy, cross origin isolation, and a
  strict CSP (`connect-src` limited to Supabase, Anthropic and OpenAI).
- Long lived cache headers on hashed assets; short revalidation on the
  service worker and manifest.
- SPA rewrites in `vercel.json` so the router owns navigation and the
  Service Worker is served with `Service-Worker-Allowed: /`.
- Docs: `docs/SECURITY.md` (data classification, CSP notes, key
  handling) and `docs/DEPLOY.md` (environments, migrations, Edge
  Function deploy, rollback, incident response).
- CI: `.github/workflows/vertex-ci.yml` runs typecheck, lint, build, and
  `npm audit` on every PR touching `vertex-platform/**`.

## 0.2.0 - Productization

Brand, landing page, PWA, SEO, and Arabic language pass.

- New Logo component and SVG icon set for the browser tab, PWA install,
  iOS home screen, and social share cards.
- Public Landing page at `/` with hero, six-feature grid, three-step
  "how it works", and install CTA. Fully bilingual.
- PWA: `manifest.webmanifest`, `service-worker.js`, `useInstallPrompt`
  hook. Installable on Android from the browser.
- SEO: title, description, canonical, hreflang, Open Graph, Twitter
  card, JSON-LD graph for `SoftwareApplication`, `Organization`, and
  `WebSite`.
- AIO: `robots.txt`, `sitemap.xml` with hreflang alternates, and
  `llms.txt` briefing.
- Every locale string reviewed and rewritten. Every em-dash and
  ellipsis removed from the codebase. Arabic register is formal.

## 0.1.0 - Session 2 - dashboard, upload, AI

- Dashboard with traffic-light stat cards, compliance trend line,
  submissions donut, activity feed, and alerts panel.
- Upload wizard: project, type, file, confirm. Uploads to the private
  `submissions` bucket.
- AI analysis service abstracted over mock, Anthropic, OpenAI, and a
  Supabase Edge Function. Provider keys stay in Supabase secrets.
- Submission Detail with tabs for Findings, Preview, Comments, and
  History; approval workflow with audit log.

## 0.0.1 - Session 1 - foundation

- Vite + React + TypeScript + Tailwind mobile first scaffold.
- Supabase migration `0001_vertex_init.sql`: 10 tables, 36 RLS policies,
  helper functions.
- Email and Password auth with Supabase.
- Bilingual `en` and `ar` with `i18next`, right to left via CSS logical
  properties.
- Protected routes, header, sidebar, footer, skip link.
