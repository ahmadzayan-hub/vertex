# VERTEX

## Product Authority

| | |
|---|---|
| **Primary User** | Contract managers / commercial teams |
| **Job To Be Done** | Administer contract compliance end-to-end |
| **System of Record** | Contracts, obligations, submissions, commercial & compliance review (certificates, invoices, claims, variations, bonds) |
| **System of Intelligence** | Compliance matrix, findings, contractor performance scores |
| **Explicit Non-Goals** | Generic document chat (→ Mutabasir) · replacing formal legal opinion · any Beyond Style code |

Contract and Project Intelligence for UAE infrastructure and services
contracts. Upload a submission (invoice, timesheet, technical document,
progress update), receive a compliance score, a traffic-light verdict,
and structured findings with clause references. Bilingual English and
Arabic with full right-to-left support. Installable on Android as a
Progressive Web App.

## Status

| Version | What ships |
|---------|-----------|
| 0.0.1 | Session 1 - auth, DB, bilingual + RTL scaffold |
| 0.1.0 | Session 2 - dashboard, upload wizard, AI analysis, review |
| 0.2.0 | Productization - brand, landing page, PWA, SEO, Arabic polish |
| 0.3.0 | Hardening - code split, realtime, palette, CSP, CI, docs |
| 0.4.0 | Session 5 - KPI, obligations, insurance renewals |
| 0.5.0 | Session 6 - analytics + PDF reports |
| 0.6.0 | Testing suite - vitest + Playwright |

See [`CHANGELOG.md`](./CHANGELOG.md) for full details.

## Stack

- **React 18** + **TypeScript 5** + **Vite 5** + **Tailwind 3**
- **Supabase** (Postgres + Auth + Storage + Edge Functions)
- **i18next** (bilingual EN + AR, RTL via CSS logical properties)
- **recharts** (dashboard + analytics charts)
- **jsPDF** (client-side report generation)
- **Vitest** + **Playwright** (unit and end-to-end tests)

## Quick start

```bash
npm install
cp .env.example .env.local        # fill in Supabase URL + anon key
npm run dev                       # http://localhost:5173
```

Every page renders without a Supabase project too, using the mock AI
provider by default (`VITE_AI_PROVIDER=mock`). Log in with a real
Supabase user to see live data on the dashboard.

### Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built app |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint on `.ts,.tsx` |
| `npm run test` | Vitest unit tests |
| `npm run test:coverage` | Vitest with v8 coverage report |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run e2e:install` | Install Chromium for Playwright |

### Environment variables

`.env.example` documents every variable. The minimum for local dev:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_AI_PROVIDER=mock              # or "edge" once the function is deployed
```

Provider keys (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) live in **Supabase
project secrets**, never in the browser bundle.

## Routes

Public:

- `/` - landing page (hero, features, install CTA)
- `/login` - sign in

Authenticated (`ProtectedRoute` redirects to `/login` without a session):

- `/dashboard` - traffic-light stat cards + activity feed
- `/upload` - four-step submission wizard
- `/submissions/:id` - review tabs (Findings, Preview, Comments, History)
- `/projects/:id` - project + submissions list
- `/kpi` - KPI penalties table + approval workflow
- `/obligations` - obligations calendar grouped by status
- `/insurance` - insurance renewals with evidence upload
- `/analytics` - portfolio-wide widgets
- `/reports` - PDF export (submission or project)

Static:

- `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml`, `/llms.txt`
- `/icon.svg`, `/apple-touch-icon.svg`, `/og-image.svg`
- `/service-worker.js`

## Database

Two migrations under `supabase/migrations/`:

- **`0001_vertex_init.sql`** - 10 tables (`users`, `projects`,
  `submissions`, `ai_findings`, `comments`, `kpi_tracking`,
  `mobilization_tracking`, `obligations`, `insurance_tracking`,
  `audit_log`), enums, indexes, `updated_at` triggers, RLS enabled with
  36 policies across four roles.
- **`0002_session2.sql`** - `get_dashboard_stats()` RPC,
  `v_recent_activity` view, private `submissions` storage bucket,
  `comments` insert policy, hot-path indexes.

Apply via the Supabase SQL editor or `supabase db push`.

## Edge Function

**`supabase/functions/analyze-submission`** proxies the browser's AI
call so keys never leave the server. Deploy with:

```bash
supabase link --project-ref <ref>
supabase functions deploy analyze-submission
supabase secrets set ANTHROPIC_API_KEY=...      # optional
supabase secrets set OPENAI_API_KEY=...         # optional
supabase secrets set AI_PROVIDER=anthropic      # optional
```

Set `VITE_AI_PROVIDER=edge` in Vercel once the function is live.

## Docs

- [`docs/DEPLOY.md`](./docs/DEPLOY.md) - environments, first-time
  setup, CI, post-deploy verification, rollback, custom domain.
- [`docs/SECURITY.md`](./docs/SECURITY.md) - data classification, CSP,
  auth model, key handling, backups, incident response.
- [`CHANGELOG.md`](./CHANGELOG.md) - every release from 0.0.1 through
  0.6.0.

## Repository layout

VERTEX is the only product in this repository — the platform lives at
the repo root (promoted from the former `vertex-platform/` directory;
the legacy Beyond Style root app now lives in the `masaar` repo). The
Vercel project builds from the repository root with the Vite framework
preset.

## Continuous integration

`.github/workflows/vertex-ci.yml` runs on every PR and every push to
`main`. Two jobs:

- **`quality`** - install, `npm audit` (production), typecheck, lint,
  Vitest, build with dummy Supabase env, upload `dist/` artefact.
- **`e2e`** - installs Chromium via
  `npx playwright install --with-deps chromium`, runs the browser
  suite, uploads the Playwright HTML report on failure.

Both jobs run in parallel where they can (the e2e job needs
`quality` to pass so failures halt early).

## Reporting a security issue

See [`docs/SECURITY.md`](./docs/SECURITY.md#reporting-a-vulnerability).
