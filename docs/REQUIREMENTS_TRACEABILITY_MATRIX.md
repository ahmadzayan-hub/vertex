# Requirements Traceability Matrix — مسار (Masaar)

## Matrix: Business Requirement → Code → Test → Verification

| §Ref | Business Requirement | Code Module | Test | Verification |
|---|---|---|---|---|
| §4 | Arabic name accuracy — never blind-transliterate; fall back to أستاذة/أستاذ | `src/lib/arabic-names.ts` | `guardrails.test.ts` — Rehab→رحاب, Kay kept, unknown→أستاذة | Unit test PASS |
| §5 | Reply length control — keep replies short and converting | `guardrails.ts` LENGTH_CHECK | `guardrails.test.ts` — length check | Unit test PASS |
| §6 | Price control — require active unexpired offer before quoting | `guardrails.ts` PRICE_CONTROL | `guardrails.test.ts` — price control | Unit test PASS |
| §6/§9 | VAT math — correct net/VAT/total breakdown | `guardrails.ts` buildTotalBreakdown() | `guardrails.test.ts` — VAT math | Unit test PASS |
| §7 | Claim control — block unverified material/quality claims; auto-reword | `guardrails.ts` BLOCKED_CLAIMS | `guardrails.test.ts` — real gold, waterproof, anti-tarnish, material claim | Unit test PASS |
| §8 | Stock control — block unverified in-stock promises | `guardrails.ts` STOCK_CONTROL | `guardrails.test.ts` — unverified stock | Unit test PASS |
| §9 | Payment before dispatch — no courier action until payment confirmed | `guardrails.ts` PAYMENT_CONTROL | `guardrails.test.ts` — dispatch before payment | Unit test PASS |
| §10 | Delivery control — no same-day outside Dubai without courier confirm | `guardrails.ts` DELIVERY_CONTROL + `growth.ts` EMIRATE_BUFFERS | `guardrails.test.ts` — same-day Sharjah | Unit test PASS |
| §11 | QC checklist — photo + packaging check before dispatch | `src/lib/operations.ts` buildQcChecklist() | `guardrails.test.ts` — QC gating | Unit test PASS |
| §14 | Privacy detection — block PII in replies | `guardrails.ts` PRIVACY_LEAK (UAE_PHONE, ADDRESS_HINTS, PAYMENT_HINTS) | `guardrails.test.ts` — phone number leak | Unit test PASS |
| §16 | Journey-stage playbook | `src/lib/operations.ts` getStagePlaybook() | Manual review | Scaffolded |
| §17 | AI analysis pipeline — intent, persona, product, risk, reply | `src/lib/ai/analyze.ts` analyzeConversation() | `POST /api/analyze` integration (gap) | Manual + mock |
| §23 | Fraud signal screening | `src/lib/operations.ts` screenFraudSignals() | `guardrails.test.ts` — fraud signals | Unit test PASS |
| §24 | Human approval matrix — sensitive actions require owner sign-off | `src/lib/operations.ts` requiresHumanApproval() | `guardrails.test.ts` — approval matrix | Unit test PASS |
| §25 | Configurable AI provider wrapper | `src/lib/ai/provider.ts` getProvider() | Build + mock mode | Build PASS |
| §26 | All 17 required pages present | `src/app/` routes | Build + manual | Build PASS, all routes present |
| §27 | Supabase schema + RLS | `supabase/migrations/0001_schema.sql` | Manual (Supabase SQL editor) | Schema reviewed |
| §28 | DB-overridable prompt library | `src/lib/ai/prompts.ts` DEFAULT_PROMPTS; `/prompts` page | Manual | Scaffolded |
| §29 | Guardrail orchestration — every reply passes control tower | `guardrails.ts` runGuardrails(); `analyze.ts` pipeline | All guardrail tests | Unit test PASS |
| §30 | 20 test-scenario conversations | `tests/guardrails.test.ts` | 20 tests | Unit test PASS (20/20) |
| §31 | Core intake flow — paste → analyze → approve | `/intake` + `/api/analyze` + `AnalysisPanel.tsx` | Manual + mock | Manual PASS |
| §33 | Acceptance: operator can complete intake → approve flow | Full intake journey | Manual | Manual PASS in demo mode |
| §34 | Phase roadmap respected | `ROADMAP.md`, DEVELOPER_NOTES.md scaffolded list | Review | Documented |

---

## Traceability: User Stories → Features

| User Story | Feature | Status |
|---|---|---|
| As an operator, I want to paste a customer message and get a validated AI reply draft | `/intake` → `/api/analyze` → `AnalysisPanel` | IMPLEMENTED |
| As an operator, I want the system to block dangerous claims before I send | Guardrail engine (10 checks) | IMPLEMENTED |
| As an operator, I want to see all recent conversations filtered by stage | `/inbox` with filter + search | IMPLEMENTED |
| As an operator, I want a daily dashboard showing leads, payments, and disputes | `/` KPIs + attention queue | IMPLEMENTED |
| As an operator, I want the app to work without Supabase during demos | Demo mode with seeded data | IMPLEMENTED |
| As an operator, I want the app installed on my phone | PWA manifest + service worker | IMPLEMENTED |
| As an operator, I want to review and manage AI prompt text | `/prompts` page + DB override | IMPLEMENTED (read) |
| As an operator, I want to track customer order status | `/orders` Kanban + table | IMPLEMENTED (read-only) |
| As an operator, I want to verify payments before dispatching | `/payments` with status filter | IMPLEMENTED (read-only) |
| As an operator, I want to monitor inventory velocity | `/inventory` velocity cards | IMPLEMENTED |
| As an operator, I want to connect NotebookLM for research | `/integrations` OAuth flow | IMPLEMENTED |
| As an operator, I want all UI in Arabic | Full bilingual Arabic/English UI | IMPLEMENTED |
| As an operator, I want to update an order status | Create/edit forms | NOT YET (Phase 2) |
| As an operator, I want to export VAT report | CSV export | NOT YET (Phase 2) |

---

## Open Traceability Gaps

| Gap | Type | Priority |
|---|---|---|
| ~~No automated integration test for `/api/analyze`~~ | ~~Test gap~~ | ✅ RESOLVED — 5 API E2E tests |
| ~~No E2E test for intake → approve journey~~ | ~~Test gap~~ | ✅ RESOLVED — 18 Playwright tests |
| No accessibility automated scan | Test gap | Medium |
| Create/edit forms not implemented | Feature gap | Medium (Phase 2) |
| Screenshot upload not persisted | Feature gap | Low (Phase 2) |
| ~~Rate limiting on `/api/analyze` not implemented~~ | ~~Security gap~~ | ✅ RESOLVED |
