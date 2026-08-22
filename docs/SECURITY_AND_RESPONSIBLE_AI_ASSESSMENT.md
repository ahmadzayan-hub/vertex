# Security and Responsible AI Assessment — مسار (Masaar)

**Assessment date:** 2026-08-09  
**Scope:** Full application stack — Next.js frontend, API routes, Supabase backend, AI pipeline, OAuth integration  
**Standards referenced:** OWASP Top 10, OWASP API Security Top 10, OWASP LLM Top 10, Privacy by Design

---

## Authentication and Session Management

| Control | Status | Detail |
|---|---|---|
| Authentication provider | IMPLEMENTED | Supabase Auth (JWT-based) |
| Route protection | IMPLEMENTED | `src/middleware.ts` — redirects to /login when no session |
| Demo-mode bypass | IMPLEMENTED | Middleware passes through when no Supabase env set |
| httpOnly session cookies | IMPLEMENTED | Supabase SSR handles cookie management |
| CSRF protection | IMPLEMENTED (OAuth) | `state` cookie in NotebookLM OAuth flow |
| Session refresh | IMPLEMENTED | `@supabase/ssr` refreshes tokens via middleware |
| Brute-force protection | PARTIAL | Supabase applies rate limits; no custom limit on login page |

**Gap:** No custom rate limiting on `/login` beyond what Supabase provides. Risk: LOW for an operator-only console with a small known user base.

---

## Authorization

| Control | Status | Detail |
|---|---|---|
| Session-based access | IMPLEMENTED | Middleware enforces authenticated session |
| Row-Level Security | IMPLEMENTED | Supabase RLS in `migrations/0001_schema.sql` |
| Role-based access control | PARTIAL | Single operator role; no admin/read-only split yet |
| Object ownership checks | DELEGATED | Supabase RLS enforces at DB level |

**Gap:** Middleware currently enforces "logged in or not" — no role separation (e.g. admin vs. read-only reviewer). Acceptable for current single-operator use case. Add `middleware.ts` role check when multi-user is required.

---

## Input Validation

| Surface | Validation | Status |
|---|---|---|
| `POST /api/analyze` body | `customerMessage` + `context` required check | IMPLEMENTED |
| AI model output | Zod schema (`analysisSchema`) | IMPLEMENTED |
| OAuth callback `code` + `state` | State cookie verification | IMPLEMENTED |
| Form inputs (intake page) | Browser-native + required attributes | PARTIAL |
| SQL injection | Supabase parameterised queries | IMPLEMENTED |

---

## Security Headers

Configured in `next.config.mjs` (applies to all routes):

| Header | Value | Status |
|---|---|---|
| `Content-Security-Policy` | Full policy with frame-ancestors 'none', upgrade-insecure-requests | IMPLEMENTED |
| `Strict-Transport-Security` | max-age=63072000; includeSubDomains; preload | IMPLEMENTED |
| `X-Frame-Options` | DENY | IMPLEMENTED |
| `X-Content-Type-Options` | nosniff | IMPLEMENTED |
| `X-DNS-Prefetch-Control` | on | IMPLEMENTED |
| `Referrer-Policy` | strict-origin-when-cross-origin | IMPLEMENTED |
| `Permissions-Policy` | camera=(), microphone=(), geolocation=(), payment=() | IMPLEMENTED |

**Note:** CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts because Next.js 14 requires them for hydration. To tighten, implement nonce-based CSP in Next.js 15+ or use a custom document.

---

## Secret Management

| Control | Status |
|---|---|
| No API keys in source code | VERIFIED |
| All secrets via environment variables | IMPLEMENTED |
| `.env.local` in `.gitignore` | VERIFIED |
| `.env.example` documents all variables | IMPLEMENTED |
| OAuth tokens AES-256-GCM encrypted in httpOnly cookies | IMPLEMENTED |
| No secrets in build output | VERIFIED |

---

## Dependency Vulnerabilities

**Remaining after upgrade (5 high severity):**

| Package | Vulnerability | Fixable? |
|---|---|---|
| `postcss` (inside next) | Irregular whitespace parsing | Only with Next.js 15 upgrade |
| `glob 10.2.0–10.4.5` (inside next) | CLI command injection | Only with Next.js 15 upgrade |
| `next 9.3.4–16.x` | Various (superseded by 14.2.35 partially) | Only with Next.js 15 upgrade |

**Risk assessment:** These vulnerabilities are in build-time tooling and Next.js internals, not in application runtime paths. The `glob` CLI injection requires shell execution of glob as a CLI tool — not the case in this application. **Recommended action:** Upgrade to Next.js 15 in the next major iteration.

---

## API Security

| Control | Status | Gap |
|---|---|---|
| Input validation on `/api/analyze` | IMPLEMENTED | — |
| Rate limiting on `/api/analyze` | MISSING | HIGH risk — unbounded AI cost |
| API authentication | IMPLEMENTED (session via middleware) | — |
| CORS | Default Next.js (same-origin) | Appropriate |
| Error messages — no stack traces exposed | IMPLEMENTED | — |
| Request body size limit | Default Next.js (~4MB) | Consider explicit limit |

**Rate limiting recommendation:** Add `next-rate-limit` or Vercel Edge Config rate limiting on `POST /api/analyze`. Target: 10 requests/minute per session.

---

## Responsible AI Assessment

### Intended Use

مسار is a human-in-the-loop sales operating console. AI outputs are drafts only. No automated customer communication is permitted. Every reply requires explicit operator approval.

### Prohibited Uses

- Auto-sending AI-generated replies without operator review
- Using the system to make definitive product claims (guardrails block this)
- Processing sensitive personal data beyond what is needed for order management
- Training AI models on customer data without explicit consent

### Human Oversight Controls

| Control | Implementation |
|---|---|
| Mandatory operator approval | "اعتماد وإرسال" button — no bypass path |
| Guardrail blocking | `worstStatus === "fail"` disables Approve button |
| Human approval matrix | Sensitive actions require owner sign-off flag |
| Order locking | Orders with open disputes are locked — no auto-dispatch |
| Audit trail | Analysis outputs stored with raw model output |

### Bias and Fairness

- Customer persona classification uses sales-relevant signals only (purchase intent, urgency, budget signals)
- Explicitly prohibited in `types.ts`: nationality, religion, age, income, family status, health

### Transparency

- AI-generated replies are clearly marked as drafts
- Guardrail findings are shown to the operator before approval
- Confidence score is displayed to operator
- Provider and model name shown in analysis result

### Data Privacy

- Customer messages processed by AI provider — confirm data processing agreements with provider
- No customer PII stored in AI context beyond what operator enters
- Privacy guardrail actively blocks personal data (phone, address, payment) from appearing in replies
- OAuth tokens encrypted at rest; no DB storage required

---

## OWASP LLM Top 10 Coverage

| Risk | Status |
|---|---|
| LLM01 Prompt Injection | PARTIAL — system/user role separation; customer message sandboxed |
| LLM02 Insecure Output Handling | IMPLEMENTED — Zod schema validates all outputs |
| LLM03 Training Data Poisoning | N/A — no fine-tuning |
| LLM04 Model Denial of Service | MISSING — no rate limiting on /api/analyze |
| LLM05 Supply Chain Vulnerabilities | PARTIAL — provider abstraction; monitor provider advisories |
| LLM06 Sensitive Info Disclosure | IMPLEMENTED — privacy guardrail blocks PII in replies |
| LLM07 Insecure Plugin Design | N/A — no plugins/tools currently |
| LLM08 Excessive Agency | IMPLEMENTED — no auto-send; human approval required |
| LLM09 Overreliance | MITIGATED — guardrail badges + confidence score shown |
| LLM10 Model Theft | N/A — standard API usage |
