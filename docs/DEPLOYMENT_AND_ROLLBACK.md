# Deployment and Rollback — مسار (Masaar)

## Deployment Platform

**Vercel** — automatic deployments from GitHub.  
Region: `fra1` (Frankfurt)  
Framework: Next.js (detected automatically via `vercel.json`)

---

## First-Time Setup

### 1. Fork / Clone

```bash
git clone https://github.com/ahmadzayan-hub/desktop-tutorial
cd desktop-tutorial
npm ci
```

### 2. Environment Variables

```bash
cp .env.example .env.local
# Edit .env.local with your real values
```

Minimum required for production:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AI_PROVIDER=mock   # or: openai | anthropic | gemini | groq
# + the relevant API key for your chosen provider
```

For demo/development with no backend:

```
# Leave all vars empty or unset — app runs in demo mode automatically
AI_PROVIDER=mock
```

### 3. Database Setup (when using Supabase)

In the Supabase SQL editor or via CLI, run in order:

```sql
-- 1. Schema and RLS
\i supabase/migrations/0001_schema.sql

-- 2. Seed data (catalogue, couriers, prompts, test scenarios)
\i supabase/seed.sql
```

Via Supabase CLI:
```bash
supabase db push
supabase db seed
```

### 4. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Link to project (first time)
vercel link

# Set environment variables in Vercel dashboard or CLI:
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add AI_PROVIDER production
vercel env add OPENAI_API_KEY production   # or your provider key
vercel env add INTEGRATION_TOKEN_SECRET production

# Deploy
vercel --prod
```

---

## Ongoing Deployment (GitHub → Vercel)

Vercel automatically deploys:

| Trigger | Environment | URL |
|---|---|---|
| Push to `main` | Production | `https://desktop-tutorial.vercel.app` |
| Push to any branch | Preview | `https://<branch>-<hash>.vercel.app` |
| Pull request | Preview | Unique per PR |

Branch `improvement/production-uiux-performance` will generate a preview URL on push.

---

## Pre-Deployment Checklist

Before merging any branch to `main`:

```bash
npm ci
npm run typecheck    # 0 errors required
npm run test         # 31/31 tests required
npm run build        # clean build required
npm audit            # review any new critical vulnerabilities
```

Also verify:
- [ ] No secrets in committed files (`git log -p | grep -i "key\|secret\|password"`)
- [ ] `.env.local` not in staging area (`git status`)
- [ ] All required env vars documented in `.env.example`
- [ ] CHANGELOG.md updated

---

## Rollback Procedures

### Option 1: Vercel Instant Rollback (Recommended)

Vercel keeps all deployments. To roll back:

1. Open Vercel dashboard → project → Deployments
2. Find the last known-good deployment
3. Click **"Promote to Production"**

Rollback is instant — no rebuild required. Zero downtime.

### Option 2: Git Revert + Redeploy

```bash
# Identify the bad commit
git log --oneline -10

# Revert it (creates a new revert commit — safe)
git revert <bad-commit-sha>

# Push — triggers Vercel rebuild
git push origin main
```

### Option 3: Emergency — Pin to Previous Deployment via CLI

```bash
vercel rollback --prod
```

---

## Environment Variables Reference

Full variable list in `.env.example`. Key variables:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For production | Leave unset for demo mode |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For production | Leave unset for demo mode |
| `SUPABASE_SERVICE_ROLE_KEY` | For server writes | Never expose to browser |
| `AI_PROVIDER` | Always | `mock` safe for demo |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | If not mock | Set only the relevant key |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | For NotebookLM | Optional feature |
| `INTEGRATION_TOKEN_SECRET` | For NotebookLM | 32-byte hex; `openssl rand -hex 32` |

---

## Branch Strategy

```
main                              ← production (auto-deploys to Vercel)
  └── improvement/production-uiux-performance  ← this audit branch
  └── feature/*                  ← feature branches
  └── fix/*                      ← bug fix branches
```

**Merge policy:**
1. All branches merge to `main` via pull request
2. PR requires: clean build + all tests pass (CI)
3. No direct push to `main`

---

## Monitoring and Observability

**Current state:** Vercel provides basic request logs and error tracking via the dashboard.

**Gaps:**
- No structured application logging beyond `console.error()`
- No uptime monitoring (recommend: Vercel + external ping)
- No error tracking service (recommend: Sentry for AI pipeline errors)
- No AI cost monitoring (recommend: track token usage per provider)

**Recommended immediate additions:**
```bash
# Add structured error logging to /api/analyze
# Log: timestamp, provider, model, latency, guardrail worst_status, error
```
