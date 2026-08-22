# Architecture — مسار (Masaar)

## Overview

مسار is a Next.js 14 App Router application. All pages use React Server Components (RSC) for data fetching, with thin `"use client"` islands for interactive elements. When Supabase environment variables are absent the app falls back to a deterministic in-memory demo universe — every page renders meaningful data on first run.

---

## Folder Structure

```
/
├── next.config.mjs           # Next.js config — CSP, HSTS, image opts, compression
├── tailwind.config.ts        # Design tokens (brand colours, font stack)
├── tsconfig.json             # Strict TS, path alias @/* → src/*
├── vercel.json               # Vercel deployment config (framework nextjs, fra1)
├── .env.example              # Documented env template
├── .eslintrc.json            # ESLint (next/core-web-vitals)
├── vitest.config.ts          # Vitest test runner config
├── public/
│   ├── manifest.json         # PWA manifest (مسار, amber theme)
│   └── sw.js                 # Service worker (network-first, skips /api/)
├── supabase/
│   ├── migrations/0001_schema.sql   # All tables + RLS policies
│   └── seed.sql                     # Default catalogue, couriers, prompts
├── tests/
│   ├── guardrails.test.ts           # 20 business-scenario unit tests
│   └── notebooklm-oauth.test.ts     # 11 OAuth/crypto tests
└── src/
    ├── middleware.ts                 # Auth route protection (session → /login)
    ├── app/                         # Next.js App Router
    │   ├── layout.tsx               # Root layout — Nav, PWA, SEO metadata
    │   ├── page.tsx                 # Dashboard (KPIs, charts, attention queue)
    │   ├── globals.css              # Design system (CSS utilities + Tailwind)
    │   ├── robots.ts / sitemap.ts   # SEO
    │   ├── login/                   # Supabase Auth sign-in
    │   ├── intake/                  # Core workflow: paste message → AI → approve
    │   ├── inbox/                   # Conversation list + AI draft viewer
    │   ├── api/analyze/             # POST — AI analysis + guardrails endpoint
    │   ├── api/integrations/notebooklm/  # OAuth authorize/callback/disconnect
    │   └── <record pages>/          # audit, couriers, customers, inventory,
    │                                #   offers, orders, payments, prompts,
    │                                #   reports, reviews, settings, suppliers
    ├── components/
    │   ├── Nav.tsx                  # Sidebar (desktop) + mobile header
    │   ├── AnalysisPanel.tsx        # Guardrail review UI (used by /intake)
    │   ├── RecordPage.tsx           # Generic server-rendered record list
    │   ├── Logo.tsx                 # SVG route-waypoints brand mark
    │   ├── charts.tsx               # Recharts wrappers (bar, line, pie)
    │   ├── LazyCharts.tsx           # Dynamic import wrapper (code-split)
    │   ├── PwaInstall.tsx           # Arabic install prompt banner
    │   ├── PwaRegister.tsx          # Service worker registration
    │   └── ui.tsx                   # Shared UI primitives (pills, badges, DemoBanner)
    └── lib/
        ├── types.ts                 # All domain types (mirror Supabase schema)
        ├── guardrails.ts            # §7/§9/§10/§14/§29 — pure control tower
        ├── operations.ts            # §11/§16/§23/§24 — QC, approval, fraud
        ├── analytics.ts             # Pure aggregations (dashboard, reports)
        ├── data.ts                  # Server read helpers + demo fallback
        ├── growth.ts                # Velocity, VIP, testimonials, delivery
        ├── arabic-names.ts          # §4 Arabic name accuracy
        ├── daily-review.ts          # Daily/weekly metric narrative
        ├── ai/
        │   ├── provider.ts          # §25 AiProvider abstraction + factory
        │   ├── prompts.ts           # §28 DEFAULT_PROMPTS (DB-overridable)
        │   └── analyze.ts           # §17 Full pipeline (context → model → Zod → guards)
        ├── demo/seed.ts             # Deterministic in-memory demo universe
        ├── integrations/
        │   ├── notebooklm.ts        # Google OAuth 2.0 pure helpers (tested)
        │   ├── secure-store.ts      # AES-256-GCM cookie token store (tested)
        │   └── notebooklm-session.ts # Status + auto-refresh (server-only)
        └── supabase/
            ├── server.ts            # createClient() for RSC + hasSupabaseEnv()
            └── client.ts            # createClient() for client components
```

---

## Data Flow

### Dashboard (read-only RSC pattern)

```
Page (RSC, force-dynamic)
  └─ fetchKpis() / fetchRows()
       ├─ hasSupabaseEnv() = false → getDemoTable() from seed.ts
       └─ hasSupabaseEnv() = true  → supabase.from(table).select(*)
  └─ renders server HTML with data
```

### Core Intake Flow

```
/intake (client component — form + state)
  └─ user pastes message + fills context
  └─ POST /api/analyze
       └─ analyzeConversation(input)
            └─ buildContextMessages()    // constructs prompt
            └─ provider.complete()       // calls AI model
            └─ extractJson()             // tolerates markdown fences
            └─ analysisSchema.parse()    // Zod validation
            └─ runGuardrails()           // pure control tower
  └─ AnalysisPanel renders result
       └─ operator copies reply + clicks "اعتماد وإرسال"
```

### Auth Middleware

```
Request → middleware.ts
  ├─ no Supabase env → pass through (demo mode)
  ├─ public path → pass through
  └─ Supabase env present
       └─ supabase.auth.getUser()
            ├─ user present → NextResponse.next()
            └─ user absent  → redirect /login?redirect=<path>
```

---

## Key Design Decisions

**Guardrails are pure functions** — no I/O, fully deterministic, unit-tested. This is the non-negotiable architectural invariant. Never add database calls or side effects to `guardrails.ts`.

**Provider wrapper returns plain strings** — `analyze.ts` owns JSON extraction and Zod validation. Swapping AI providers requires zero changes to business logic.

**Demo mode is always available** — `hasSupabaseEnv()` gates every Supabase call. Pages always render something meaningful. No "connect Supabase first" blank screens.

**Arabic RTL** — `<html lang="ar" dir="rtl">` on the root, sidebar forced `dir="ltr"` to stay left. Components use `lang="ar"` on Arabic text elements for correct font shaping.

**Secrets only in env** — zero API keys in source code. `AI_PROVIDER=mock` for development without any API key.

---

## Route Table

| Route | Rendering | Auth required |
|---|---|---|
| `/login` | Static | No |
| `/` | Dynamic (RSC) | Yes |
| `/intake` | Static (client) | Yes |
| `/inbox` | Dynamic (RSC + client) | Yes |
| `/customers` `/orders` `/payments` `/inventory` `/offers` `/couriers` `/suppliers` `/reviews` `/prompts` `/settings` `/audit` | Dynamic (RSC) | Yes |
| `/reports` | Dynamic (RSC) | Yes |
| `/integrations` | Dynamic (RSC) | Yes |
| `/api/analyze` | API route | Yes (session) |
| `/api/integrations/notebooklm/*` | API routes | Varies |
| `/robots.txt` `/sitemap.xml` `/manifest.json` `/sw.js` | Static/public | No |
