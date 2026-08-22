# VERTEX baseline audit

Snapshot of the project the moment this audit round began. Records what
already works, what the automated gates say, and the defect inventory
that drives Phase 6 implementation. Written before any code was touched
in this pass so a reader can trace what was true at time zero.

## 1. Repository snapshot

| Item | Value |
|---|---|
| App root | `vertex-platform/` (isolated sub-app in a monorepo) |
| Stack | Vite 5 + React 18 + TypeScript 5 + Tailwind 3 |
| Backend | Supabase (Postgres + Auth + Storage + Edge Function) |
| Testing | Vitest 2 + jsdom + Testing Library, Playwright 1 |
| Deployment | Vercel (SPA), Supabase project (data + Edge) |
| Bilingual | i18next EN/AR with `document.dir` and Tailwind logical properties |
| Session branch | `claude/vertex-followups-all` (session policy: land pushes on `claude/vertex-*`) |
| Baseline HEAD | `523721f feat(vertex): follow-ups sweep …` (PR #95 open, unmerged) |

The audit stays inside `vertex-platform/**` and the two `.github/workflows/vertex-*.yml` files. Nothing outside those paths gets touched.

## 2. Automated gates (baseline)

Every gate below was run cold against the working tree with no fixes applied. Numbers are real, not aspirational.

| Gate | Command | Result | Notes |
|---|---|---|---|
| Typecheck | `npm run typecheck` | **PASS** | Zero errors, no output |
| Lint | `npm run lint` | **PASS** | Zero warnings, no output |
| Unit tests | `npm run test` | **PASS 44/44** | 6 files, 4.11s wall, two expected stderr lines about missing Supabase env vars (test-mode warning, not a failure) |
| Production build | `npm run build` | **PASS** | 1322 modules, 14.02s, no warnings |
| Bundle-size gate | `npm run bundle:check` | **PASS** | Largest gated chunk `pdf` at 128 KB gz (limit 140), `charts` at 108 KB gz (limit 125), `supabase` at 52 KB gz (limit 65) — all comfortably inside their families' ceilings |

The bundle-size script correctly ignores non-gated chunks (`AppShell`, `EmptyState`, `Skeleton`, `NotFound`, `audit`, `storage`, `useDashboardStats`, `useProjects`, `useSubmissions`) and calls them out as "no limit set" rather than silently passing them.

## 3. Application shape (verified from source)

Router (from `src/App.tsx`):

- Public: `/`, `/login`
- Authenticated (wrapped in `ProtectedRoute`): `/dashboard`, `/upload`, `/submissions/:id`, `/projects/:id`, `/kpi`, `/obligations`, `/insurance`, `/analytics`, `/reports`
- Catchall: `NotFound`
- One dead alias: `/projects` renders `<Dashboard />` (see §4, defect V-01)

Providers stacked at the root: `ErrorBoundary → BrowserRouter → AuthProvider → RTLWrapper → CommandPaletteProvider → Suspense`. Every authenticated page is `React.lazy` code-split.

Pages present: Landing, Login, Dashboard, Upload, SubmissionDetail, ProjectDetail, KpiTracker, Obligations, InsuranceRenewals, Analytics (shell) + `pages/analytics/AnalyticsCharts` (lazy panel), Reports, NotFound.

Test coverage present: 6 unit files (`dashboard-stats`, `formatters`, `mock-analyzer`, `severity-badge`, `stat-card`, `storage`) and 4 e2e specs (`auth-gates`, `happy-path` [gated by `E2E_*` secrets, skipped by default], `landing`, `public-files`).

## 4. Defect inventory

Severities: **Critical** — blocks release. **High** — breaks a real user journey or a security promise. **Medium** — visible cracks. **Low** — polish or dead code.

| ID | Sev | File:line | What breaks | User impact |
|---|---|---|---|---|
| V-01 | High | `src/components/layout/Sidebar.tsx:25` → `src/App.tsx:104-110` | Sidebar "Projects" links to `/projects`, but that route renders `<Dashboard />`. There is no real project-list page. | User clicks the second-most-obvious nav item and lands back on the Dashboard, not a project list. Erodes trust in the nav. |
| V-02 | Medium | `docs/FOLLOWUPS.md` (entire file) | Follow-up doc lists three items as pending that have already shipped: server-side file validation (migration `0003`), backup automation (workflow `vertex-backup.yml`), authenticated e2e (spec `happy-path.spec.ts` + fixtures `seed.sql`). PDF Arabic font is also mis-stated as pending when the scaffold shipped in v0.6.3. | Reviewer reading the doc is misled about ship state; work looks unfinished when it is scaffolded. |
| V-03 | Low | `src/App.tsx:103-110` | Route `/projects` is a placeholder that reuses Dashboard. Even if V-01 is fixed by rewiring the nav, the placeholder route should be replaced or removed to avoid a silent alias. | None until a user types the URL by hand. Dead code. |
| V-04 | High | `src/components/auth/LoginForm.tsx:111-118` | "Forgot password" is `href="#"` + `onClick={(e) => e.preventDefault()}`. No route, no email, no toast. | Locked-out user clicks it and nothing happens. Dead control on the most safety-critical screen. |
| V-05 | High | `src/components/submissions/UploadWizard.tsx:28-42, 222` | 4-step wizard state (project, type, file, name) lives in `useState` only. No `beforeunload`, no confirm-on-cancel (`Cancel` at :222 is `navigate(-1)` immediately). | Accidental refresh, browser back, or clicking a nav item discards the whole upload including the selected file with zero warning. |
| V-06 | High | `src/components/submissions/ApprovalPanel.tsx:29` | Approve / Conditional / Reject actions gate on `window.confirm(...)`. `docs/SECURITY.md:28` acknowledges this but never remediated. | Native OS dialog: unstyled, ignores app language and direction, cannot be tested reliably in Playwright. |
| V-07 | High | `src/pages/Landing.tsx:20-25` | iOS "install" fallback uses `alert(...)`. | iOS Safari users clicking Install see a raw OS alert with the i18n string. |
| V-08 | High | `src/pages/Analytics.tsx:47-82` | Zero-data state renders four "0/100"/"0" cards + empty chart placeholders. No empty state copy. | New tenants (and any tenant before they upload) see a screen that reads as broken, not empty. |
| V-09 | High | `src/pages/InsuranceRenewals.tsx:147-160` | "Upload evidence" button rendered for every authenticated user; no `profile?.role` check (contrast: `ApprovalPanel` does check). | Read-only viewer sees an actionable button whose Storage write silently fails at RLS. Confusing failure mode. |
| V-10 | High | `src/pages/Reports.tsx:31` | `generatedAt: new Date().toLocaleString()` uses browser locale, not app `language`. | Arabic-selected user gets English/OS-locale timestamps embedded in the PDF header. |
| V-11 | High | `src/components/layout/Sidebar.tsx:41-77` | Mobile drawer has no focus trap, no auto-focus on open, no Escape handler, no `role="dialog"` / `aria-modal`. | Keyboard/screen-reader mobile users can tab past the "modal" drawer into the page behind it. Only mouse-click on backdrop closes it. |
| V-12 | High | `src/pages/SubmissionDetail.tsx:141-217` | `role="tablist"` / `role="tab"` are set but no `tabpanel` role, no `id`/`aria-controls`/`aria-labelledby` linkage, no arrow-key nav. | Screen readers announce tabs but the WAI-ARIA tab pattern is broken end-to-end. |
| V-13 | Medium | `src/components/layout/AppShell.tsx:32`, `src/pages/Login.tsx:30`, `src/components/common/Skeleton.tsx:25` | Hardcoded English `aria-label`s: "Main content", "Login", default "Loading". | AR screen-reader users always hear English at three high-traffic spots. |
| V-14 | Medium | `src/components/common/ErrorBoundary.tsx:22-25` | "Something went wrong." hardcoded English, and `err.message` rendered raw. | AR user hitting a render crash sees English copy plus a leaked internal error string. |
| V-15 | Medium | `src/components/common/CommandPalette.tsx:31-40, 187, 221` | `ROUTE_HITS` titles ("Dashboard", "Upload submission", …) hardcoded EN, keybinding legend hardcoded EN, no-results state renders `t('common.unknown')` ("Unknown") instead of a real empty. | AR user opens ⌘K and sees English route names + a confusing "Unknown" when nothing matches. |
| V-16 | Medium | `src/pages/KpiTracker.tsx:33` vs `src/components/submissions/ApprovalPanel.tsx:25` | KPI-penalty approval requires `admin`, submission approval allows `admin` OR `reviewer`. | Reviewer can approve a submission but not the KPI penalty tied to it. Inconsistent authz surface. |
| V-17 | Medium | `src/pages/SubmissionDetail.tsx:215-217` | "history" tab renders `<EmptyState … />` permanently — no data feed. | Tab that never has content. Confuses users into thinking data is missing. |
| V-18 | Medium | `src/pages/ProjectDetail.tsx:75` | `project.status` rendered raw (e.g. `in_progress`), not via `t(...)`. Other status fields on the same page are translated. | Inconsistent EN/AR presentation for status. |
| V-19 | Medium | `src/pages/Reports.tsx:32` | `pageLabel` passes literal `'{{n}}' / '{{total}}'` sentinels through i18next's `t(...)`. If AR keys use different placeholder names or omit them, page numbers silently break in the PDF footer. | Silent PDF regression when i18n drifts. |
| V-20 | Medium | All authenticated pages (route-change side) | No `focus()` moved to main / heading on route change. | AT users get no page-change announcement when moving through NavLink. |
| V-21 | Low | `src/components/layout/Footer.tsx:3` | `APP_VERSION = '0.1.0'` hardcoded, will drift from `package.json`. | Footer shows stale version after every release. |
| V-22 | Low | `src/hooks/useRTL.ts:12-16` | `document.documentElement.dir/lang` set only inside `useEffect`. | AR session on deep-linked route paints LTR for one frame before flipping — visible FOUC. |
| V-23 | Low | `src/components/auth/AuthProvider.tsx:25`, `src/services/audit.ts:35`, `src/main.tsx:24` | `console.warn` messages ship in production. | Visible in DevTools; not a functional bug but leaks internal detail. |

Security / AI / AuthZ findings from the parallel deep-dive land as V-24+ below when that agent reports.

## 5. What this baseline is not

- Not a Lighthouse run. No Chromium is booted here — Playwright is installed but the app is not served from this session. Performance and accessibility scores get captured in the follow-up `docs/PERFORMANCE_REPORT.md` when the app runs in preview mode (that requires the dev harness to boot the browser, which is deferred to the release-readiness gate).
- Not a manual keyboard/screen-reader walkthrough. That is a human-in-the-loop gate; the audit calls it out in the release-readiness report as an outstanding pre-launch step.
- Not a live security scan. The security surface is reviewed statically against the CSP, RLS policies, Edge Function, and client-side surfaces. Third-party dependency CVEs are covered by `npm audit --omit=dev --audit-level=high` in `vertex-ci.yml`, which currently warns without failing (by design).

## 6. Priority for Phase 6 implementation

1. **V-01** (High): fix the Projects nav — either build a real project-list page or point the nav to an existing route.
2. **V-02** (Medium): refresh `docs/FOLLOWUPS.md` to reflect what actually shipped.
3. **V-03** (Low): remove the dead `/projects` route alias in `App.tsx` once V-01 is resolved (do them together — one commit).
4. Everything the two Explore agents surface in this same pass, up to whatever fits in one reviewable commit without breaking any of the six gates in §2.

## 7. Non-goals for this audit round

- No architectural rewrite. The current feature-per-page + hooks + services split is fine; no benefit that justifies churn.
- No new UI framework or design system swap.
- No dependency major bumps (React 18 → 19, Vite 5 → 6, etc.) without a separate reason.
- No production data touch. No `main`-branch push. No PR merge.
