# Project Audit Baseline — مسار (Masaar)

**Date:** 2026-08-09  
**Branch audited:** `claude/create-dashboard-platform-R85xr`  
**Improvement branch:** `improvement/production-uiux-performance`

---

## Executive Summary

مسار (Masaar) is a Next.js 14 human-approved sales operating console for Beyond Style UAE social commerce. The core AI pipeline, guardrail engine, and all 31 unit tests pass. The application renders correctly in demo mode (no Supabase required) and builds without TypeScript errors. Before this audit, the project lacked ESLint configuration, Content Security Policy, auth middleware, and all structured documentation. Those gaps are addressed on the improvement branch.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | Next.js App Router | 14.2.35 |
| Language | TypeScript | 5.6 |
| Styling | Tailwind CSS | 3.4 |
| Database | Supabase (Postgres + Auth) | @supabase/ssr 0.5 |
| AI providers | OpenAI / Anthropic / Gemini / mock | configurable |
| Charts | Recharts | 2.12 |
| Validation | Zod | 3.23 |
| Testing | Vitest | 3.2.7 |
| Package manager | npm | — |
| Deployment | Vercel | fra1 region |

---

## Architecture Overview

```
src/
  app/                      # Next.js App Router pages (18 routes)
  components/               # Shared UI (Nav, AnalysisPanel, RecordPage, charts)
  lib/
    types.ts                # Domain types — mirror Supabase schema
    guardrails.ts           # Control tower — pure, tested, no I/O
    operations.ts           # QC checklist, approval matrix, fraud screening
    analytics.ts            # Pure aggregations for dashboard/reports
    data.ts                 # Server read helpers (Supabase or demo fallback)
    growth.ts               # Velocity, VIP, testimonials, delivery windows
    arabic-names.ts         # §4 Arabic name accuracy (pure, tested)
    daily-review.ts         # Daily/weekly metric narrative
    ai/
      provider.ts           # AiProvider abstraction (factory pattern)
      prompts.ts            # DEFAULT_PROMPTS (DB-overridable)
      analyze.ts            # Full pipeline: context → model → Zod → guardrails
    demo/seed.ts            # Deterministic in-memory demo universe
    integrations/           # NotebookLM OAuth helpers (pure, tested)
    supabase/               # SSR client + server clients
supabase/
  migrations/0001_schema.sql
  seed.sql
tests/
  guardrails.test.ts        # 20 business-scenario unit tests
  notebooklm-oauth.test.ts  # 11 OAuth/crypto unit tests
```

---

## Baseline Quality Scores

| Control | Before | After (improvement branch) |
|---|---|---|
| Production build | PASS | PASS |
| TypeScript errors | 0 | 0 |
| ESLint configured | NO | YES (next/core-web-vitals) |
| Lint errors | N/A | 0 |
| Unit tests | 31/31 PASS | 31/31 PASS |
| E2E tests | NONE | NONE (gap documented) |
| npm vulnerabilities | 13 (2 critical, 8 high) | 5 (0 critical, 5 high) |
| Content Security Policy | MISSING | IMPLEMENTED |
| HSTS | MISSING | IMPLEMENTED |
| Auth middleware | MISSING | IMPLEMENTED |
| Next.js version | 14.2.15 | 14.2.35 |
| Vitest version | 2.1.2 | 3.2.7 |
| docs/ directory | MISSING | CREATED (14 files) |

---

## Findings

### Critical

| ID | Finding | Impact | File |
|---|---|---|---|
| C-01 | No auth middleware — all routes accessible without session when Supabase is configured | Unauthorised access to all operator data | — (now fixed: `src/middleware.ts`) |
| C-02 | No Content Security Policy — XSS risk, no framing protection beyond vercel.json partial header | XSS attack surface | — (now fixed: `next.config.mjs`) |

### High

| ID | Finding | Impact | File |
|---|---|---|---|
| H-01 | ESLint not configured — `npm run lint` failed interactively | Code quality drift, no lint gate in CI | — (now fixed: `.eslintrc.json`) |
| H-02 | 5 npm vulnerabilities in Next.js 14 internals (postcss, glob) | Supply-chain risk; cannot resolve without Next.js 15 upgrade | `package.json` |
| H-03 | No rate limiting on `POST /api/analyze` | Unbounded AI cost exposure; DoS vector | `src/app/api/analyze/route.ts` |
| H-04 | No CI/CD pipeline | No automated gate on PRs; quality regressions ship undetected | — |
| H-05 | README quick-start references `cd beyond-style-uae` (wrong directory) | New developers cannot set up the project from docs alone | `README.md` (now fixed) |

### Medium

| ID | Finding | Impact | File |
|---|---|---|---|
| M-01 | Record pages are read-only lists; no create/edit forms | Operators cannot manage records from the dashboard | Phase 2 roadmap item |
| M-02 | No E2E test coverage | Regressions in critical user journeys undetected | — |
| M-03 | Screenshot upload posts to AI but does not persist to Supabase Storage | Media lost after session | DEVELOPER_NOTES.md scaffolded item |
| M-04 | No `robots.txt` or `sitemap.xml` for authenticated pages | SEO and crawl intent correct but not tuned | `src/app/robots.ts` |
| M-05 | `next.config.mjs` lacked image optimization and compression | Suboptimal delivery for any images served | (now fixed) |
| M-06 | Middleware `X-Frame-Options` was SAMEORIGIN (vercel.json) | Should be DENY for a non-embeddable operator console | (now fixed: DENY) |

### Low

| ID | Finding | Impact | File |
|---|---|---|---|
| L-01 | No `CHANGELOG.md` | Release history opaque | (now created) |
| L-02 | No structured docs directory | Onboarding difficulty | (now created) |
| L-03 | `beyond-style-uae/` subfolder present but excluded from TS | Confusion for new contributors | Excluded in `tsconfig.json` — acceptable |
| L-04 | No bundle analyser script | Performance regressions hard to detect | Documented in `docs/PERFORMANCE_REPORT.md` |

---

## Reproduction Steps for Key Issues

**C-01 (missing auth middleware):**  
Before fix: any route accessible without authentication when Supabase configured.  
Verification: `GET /orders` with no session cookie → was 200, now → 302 to `/login`.

**C-02 (missing CSP):**  
Before: `curl -I https://app/` returned no `Content-Security-Policy` header.  
After: CSP header with `frame-ancestors 'none'`, `upgrade-insecure-requests`, and full source allow-lists.

**H-01 (no ESLint):**  
`npm run lint` launched interactive setup wizard — not usable in CI.  
After: `npm run lint` runs non-interactively and exits 0.

---

## Priority Implementation Order

1. ✅ Auth middleware (C-01)
2. ✅ Content Security Policy (C-02)
3. ✅ ESLint configuration (H-01)
4. ✅ Next.js + Vitest version upgrades (H-02 partial)
5. 🔲 Rate limiting on `/api/analyze` (H-03)
6. 🔲 GitHub Actions CI pipeline (H-04)
7. ✅ README quick-start fix (H-05)
8. 🔲 E2E tests for critical journeys (M-02)
9. 🔲 Create/edit forms for record pages (M-01 — Phase 2)
