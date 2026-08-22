# Beyond Style UAE — Customer Conversion & Order Control Agent

A **human-approved sales operating console** for Beyond Style UAE
(BEYOND CONNECT GENERAL TRADING L.L.C). This is **not** an auto-reply bot. It is
a control tower for UAE social commerce: the agent **drafts** replies and order
actions, the owner **approves**, the system **tracks**, and the dashboard
**learns**. Automation comes later — only after the system proves it does not
make pricing, delivery, stock, or privacy mistakes.

> The agent drafts → you approve → the system tracks → the dashboard learns → automation comes later.

## Why this shape

If you automate too early, you scale mistakes. This MVP scales *discipline*
instead: every drafted customer reply is forced through a **guardrail engine**
before an operator can approve and send it.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (Postgres + Auth + Storage)
- **Configurable AI provider wrapper** — OpenAI / Anthropic (Claude) / Gemini /
  `mock`. No API keys are hard-coded; everything is env-driven.
- **Vitest** for the guardrail/logic test suite.

## Quick start

```bash
# The app is at the repository root — no subdirectory needed
npm install
cp .env.example .env.local      # fill in Supabase + AI provider (or leave blank for demo mode)
npm run test                    # 31 unit tests — guardrail scenarios + OAuth crypto
npm run dev                     # http://localhost:3000
```

The app runs **before** Supabase is configured (demo mode uses seeded in-memory data)
and **before** an AI key is set (`AI_PROVIDER=mock` returns safe placeholder analysis
so you can see the full flow end-to-end without any credentials).

### Database

In the Supabase SQL editor (or via the CLI), run in order:

1. `supabase/migrations/0001_schema.sql` — all tables + RLS.
2. `supabase/seed.sql` — default catalogue, offers, couriers, prompts,
   settings, and the §30 test-scenario conversations.

### Environment

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side privileged writes |
| `AI_PROVIDER` | `openai` \| `anthropic` \| `gemini` \| `mock` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | provider keys |

## The control tower (guardrail engine)

`src/lib/guardrails.ts` runs every drafted reply through checks. A **fail**
blocks the Approve button; a **warn** surfaces a caution; some findings force
**owner approval**:

| Guard | Rule |
| --- | --- |
| Claim (§7) | Blocks "real gold", waterproof, anti-tarnish, etc. without supplier evidence; auto-rewords to safe wording |
| Privacy (§14) | Detects phone / address / payment data leaking into a reply |
| Price (§6) | Requires an active, unexpired offer before quoting; price-first |
| Stock (§8) | Blocks unverified in-stock promises |
| Delivery (§10) | Blocks same-day-outside-Dubai without courier confirmation |
| Payment (§9) | No courier dispatch until payment is confirmed |
| VAT (§6/§9) | Flags missing VAT line when applicable |
| Arabic name (§4) | Never blind-transliterates; falls back to أستاذة / أستاذ |
| Length / answered / payment-step (§5/§29) | Keeps replies short, on-point, and converting |

Plus: QC checklist (§11), human-approval matrix (§24), fraud screening (§23),
and the journey-stage playbook (§16) live in `src/lib/operations.ts`.

## Core flow (acceptance §31, §33)

`/intake` → paste a customer message + known facts (+ optional screenshot) →
`POST /api/analyze` → structured `AnalysisOutput` JSON + guardrail findings →
operator reviews badges, copies the (possibly auto-corrected) reply, and
**Approves to send**.

## Review scorecard

| Area | Where it lives |
| --- | --- |
| Customer intake | `/intake` (text + screenshot) |
| AI analysis (intent/persona/product/risk/next action) | `src/lib/ai/analyze.ts` |
| Arabic name handling | `src/lib/arabic-names.ts` (tested) |
| Price / stock / delivery / payment control | `src/lib/guardrails.ts` (tested) |
| Privacy detection | guardrails + intake pre-check |
| QC checklist | `src/lib/operations.ts` (tested) |
| Dashboard (conversion / payment / delivery) | `/` |
| Daily & weekly improvement loops | `/reports` |

## Tests

`npm run test` covers the §30 business scenarios against the pure logic:
real-gold claim, privacy leak, unverified stock, same-day Sharjah delivery,
dispatch-before-payment, VAT math, Arabic name mapping (Rehab→رحاب, Kay kept
as-is), QC gating, approval matrix, and fraud signals.

## Pages (§26)

Login · Dashboard · New Conversation (intake) · Customer Inbox · Customers ·
Orders · Inventory · Offers · Payments · Courier Tracking · Suppliers · Reviews ·
Reports & Reviews · Integrations · Settings · Prompt Management · Audit Log.

### Integrations — NotebookLM (Google OAuth)

`/integrations` connects the console to NotebookLM via Google OAuth 2.0
(authorization-code flow). Set `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
(see `.env.example`), add `<origin>/api/integrations/notebooklm/callback` as an
authorized redirect URI in Google Cloud Console, then click **Connect**. Tokens
are AES-256-GCM-encrypted in an httpOnly cookie — no DB required, nothing exposed
to the browser. The page shows a "not configured" state until the env is set.

See `DEVELOPER_NOTES.md` for architecture details and `ROADMAP.md` for phases.
