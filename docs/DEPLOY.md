# VERTEX deploy runbook

VERTEX ships as a Vite single page app on Vercel. Supabase provides
Postgres, Auth, Storage, and the analyze Edge Function.

## Environments

| Environment | Purpose | Vercel project | Supabase project | Branch |
|-------------|---------|----------------|------------------|--------|
| Preview | Every PR gets a Vercel preview URL | `vertex-platform` | shared staging | `claude/vertex-*` |
| Staging | Long lived pre production shake down | `vertex-platform` | staging | `staging` (optional) |
| Production | Live | `vertex-platform` | production | `main` |

**Never share the production Supabase project between staging and prod.**
Reviewers should be able to break staging without paging on-call.

## First time setup

1. Create two Supabase projects, staging and production, in the UAE
   region if available (`me-south-1`).
2. In each Supabase SQL editor, run in order:
   - `vertex-platform/supabase/migrations/0001_vertex_init.sql`
   - `vertex-platform/supabase/migrations/0002_session2.sql`
   - `vertex-platform/supabase/migrations/0003_server_upload_validation.sql`
3. Deploy the Edge Function:
   ```
   supabase link --project-ref <ref>
   supabase functions deploy analyze-submission
   ```
4. Set Supabase project secrets:
   ```
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase secrets set AI_PROVIDER=anthropic
   ```
5. Create the Vercel project:
   - Import the GitHub repo.
   - Root directory: `vertex-platform`.
   - Framework preset: Vite (auto detected).
   - Production branch: `main`.
6. Vercel environment variables (per environment):
   ```
   VITE_SUPABASE_URL       = https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY  = <public anon key>
   VITE_AI_PROVIDER        = edge
   ```
7. First deploy runs automatically on the first push.

## Continuous integration

`.github/workflows/vertex-ci.yml` runs on every PR that touches
`vertex-platform/**` and on pushes to `main`. Jobs:

- `npm ci` (locked install).
- `npm audit --omit=dev --audit-level=high` (warns, does not fail).
- `npm run typecheck`.
- `npm run lint`.
- `npm run build` with dummy env variables so the Vite build passes
  without real Supabase secrets.
- Uploads `dist/` as an artifact.

## Post deploy verification

1. `GET /` returns the Landing page.
2. `GET /robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/llms.txt`
   return 200 with the expected content types.
3. Login flow: create a test user via the Supabase dashboard, sign in,
   navigate `/dashboard`, verify RLS returns only their projects.
4. Upload a sample PDF via `/upload`. Verify:
   - File lands in the `submissions` bucket at
     `<project_id>/<submission_id>/<name>`.
   - `ai_findings` row(s) appear.
   - Compliance score, traffic light and confidence populate.
   - Realtime subscription updates the tab without a page refresh.
5. Approve the submission. Verify a row appears in `audit_log`.

## Rollback

- Vercel: use the dashboard to promote a previous deployment.
- Supabase migrations: keep every migration idempotent so re-applying is
  safe. For destructive changes ship them as reversible pairs
  (`up_ / down_`).

## Incident response

- Availability alerts should page from Vercel status webhooks and
  Supabase health checks (Session 3: wire to PagerDuty or similar).
- On Supabase read outage: the browser retries with exponential backoff
  via the Supabase client; realtime reconnects on its own.
- On AI provider outage: set `AI_PROVIDER=mock` in Supabase secrets and
  redeploy the Edge Function. The mock returns realistic findings so the
  flow keeps working without a real model call.

## Custom domain

1. Add the domain in Vercel and follow the DNS instructions.
2. Update the following files to use the new host (they carry the
   fallback `https://vertex.ae/`):
   - `vertex-platform/index.html` (canonical, hreflang, JSON-LD, OG).
   - `vertex-platform/public/sitemap.xml`.
   - `vertex-platform/public/robots.txt`.
   - `vertex-platform/public/llms.txt`.
3. Redeploy.

## Compute regions

Vite build runs anywhere, but the Edge Function should be in the closest
Supabase region to where reviewers work. `me-south-1` (Bahrain) is the
right default for UAE traffic. Set the Vercel deployment region to
`fra1` for now; move to `bom1` or `dxb1` when Vercel offers them.
