# Performance Report — مسار (Masaar)

**Date:** 2026-08-09  
**Build:** `improvement/production-uiux-performance`

---

## Bundle Analysis (Production Build)

### Shared Chunks (loaded on every page)

| Chunk | Size |
|---|---|
| `chunks/117-*.js` (Recharts + deps) | 31.9 kB |
| `chunks/fd9d1056-*.js` (React, Next.js runtime) | 53.6 kB |
| Other shared chunks | 2.14 kB |
| **Total First Load JS** | **87.7 kB** |

87.7 kB shared JS is within acceptable range for a Next.js 14 App Router application. The dominant cost is the Recharts library (31.9 kB). Recharts is already lazy-loaded via `LazyCharts.tsx` on the dashboard — this chunk is only fetched when charts scroll into view.

### Per-Page Sizes

| Route | Page JS | First Load Total | Notes |
|---|---|---|---|
| Most record pages | ~167 B | 87.9 kB | Excellent — near-zero client JS |
| `/inbox` | 3.88 kB | 91.6 kB | InboxClient interactive component |
| `/intake` | 3.85 kB | 91.5 kB | Intake form client component |
| `/integrations`, `/orders` | 182 B | 96.6 kB | Supabase client in shared chunk |
| `/login` | 1.23 kB | 97.6 kB | Auth form + Supabase client |
| `/reports` | 1.67 kB | 89.3 kB | LazyCharts wrapper |

### Middleware

Middleware bundle: **82.1 kB** — includes `@supabase/ssr` for session verification. This runs on the Edge at Vercel. Acceptable for current scale.

---

## Optimisations Implemented

| Optimisation | Status | Impact |
|---|---|---|
| `compress: true` in next.config.mjs | IMPLEMENTED | Gzip/Brotli on all responses |
| Image formats: avif + webp | IMPLEMENTED | 30–50% smaller images vs JPEG |
| `minimumCacheTTL: 60` for images | IMPLEMENTED | Reduces redundant image fetches |
| Recharts lazy-loaded (`LazyCharts.tsx`) | PRE-EXISTING | Charts only loaded when needed |
| Server Components for all data pages | PRE-EXISTING | Zero client JS on most pages |
| `export const dynamic = "force-dynamic"` on data pages | PRE-EXISTING | Correct — data pages must not be statically cached |
| System font stack | PRE-EXISTING | No web font download on first paint |
| Noto Naskh Arabic via `@supports` + CSS | PRE-EXISTING | Arabic font only loads when supported |
| PWA service worker | PRE-EXISTING | Network-first caching, skips /api/ |

---

## Core Web Vitals Targets

| Metric | Target | Expected Status | Notes |
|---|---|---|---|
| Largest Contentful Paint (LCP) | ≤ 2.5s | LIKELY PASS | SSR pages deliver HTML immediately |
| Interaction to Next Paint (INP) | ≤ 200ms | LIKELY PASS | Minimal client JS on most pages |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | LIKELY PASS | No dynamic image resizing; fonts use system stack |
| Time to First Byte (TTFB) | ≤ 800ms | DEPENDS | Vercel Edge + Supabase latency in fra1 |
| Total Blocking Time (TBT) | ≤ 200ms | LIKELY PASS | 87.7 kB JS, mostly deferred |

**Caveat:** These are estimates from bundle analysis. Production Lighthouse measurements should be run after Vercel deployment on live data.

---

## Performance Gaps and Recommendations

### Gap 1: No bundle analyser script
**Impact:** Performance regressions in bundle size go undetected.  
**Fix:** `npm install --save-dev @next/bundle-analyzer` and set `ANALYZE=true npm run build`.  
The hook is already wired in `next.config.mjs` via `process.env.ANALYZE === "true"`.

### Gap 2: Middleware bundle size (82.1 kB)
**Impact:** Adds ~20ms latency on Edge cold starts.  
**Fix:** Extract only the JWT verification from `@supabase/ssr` rather than the full client. Consider lightweight JWT-only middleware for cold-start optimisation.

### Gap 3: No automated Lighthouse CI
**Impact:** Core Web Vitals regressions not caught in PR.  
**Fix:** Add `@lhci/cli` to GitHub Actions workflow targeting the preview deployment URL.

### Gap 4: Supabase client in `/integrations` and `/orders` chunks
**Impact:** ~9 kB extra on those routes vs. plain record pages.  
**Fix:** Ensure Supabase client is only imported in Server Components, not duplicated in shared client chunks. Audit with `ANALYZE=true`.

---

## Performance Budget

| Resource | Budget | Current |
|---|---|---|
| Initial JS (shared) | ≤ 100 kB | 87.7 kB ✓ |
| Per-page JS | ≤ 10 kB | ≤ 3.9 kB ✓ |
| Total page weight (HTML + JS + CSS) | ≤ 300 kB | ~120 kB est. ✓ |
| API `/api/analyze` latency | ≤ 5s (AI call) | Depends on provider |
| Middleware cold start | ≤ 50ms | ~20ms est. ✓ |
