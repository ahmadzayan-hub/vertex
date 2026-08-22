# AI System and Prompt Architecture — مسار (Masaar)

## Design Philosophy

The AI layer in مسار is a **drafting assistant, not an autonomous agent**. Every AI output passes through the guardrail engine before an operator can act on it. No reply is ever sent to a customer without human approval. This is explicitly encoded in `src/lib/guardrails.ts` and enforced by the UI (`AnalysisPanel.tsx`).

> The agent drafts → you approve → the system tracks → the dashboard learns → automation comes later.

---

## Provider Abstraction (`src/lib/ai/provider.ts`)

```typescript
interface AiProvider {
  complete(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}
```

`getProvider()` is a factory that reads `AI_PROVIDER` from env and returns the appropriate implementation. Supported providers:

| Provider | Env var | Notes |
|---|---|---|
| `mock` | — | Returns deterministic placeholder JSON; safe for dev/demo |
| `openai` | `OPENAI_API_KEY`, `OPENAI_MODEL` | GPT-4o default |
| `anthropic` | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Claude Sonnet default |
| `gemini` | `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini 1.5 Pro default |
| `groq` | `GROQ_API_KEY`, `GROQ_MODEL` | Llama 3.1 70B default |
| `together` | `TOGETHER_API_KEY`, `TOGETHER_MODEL` | Qwen 2.5 72B default |

**Invariant:** `provider.complete()` always returns a plain string. JSON extraction and schema validation happen in `analyze.ts`, never in the provider.

---

## Prompt Architecture (`src/lib/ai/prompts.ts`)

Prompts are stored in `DEFAULT_PROMPTS` — a typed `Record<PromptKey, string>`. Every prompt key corresponds to a specific business function:

- `system` — core identity, role constraints, guardrail awareness
- `analysis` — structured analysis output schema + instructions
- `reply_draft` — reply tone, Arabic/English rules, length constraints
- `daily_review` — daily performance narrative format
- `weekly_review` — weekly summary format

**DB-override pattern:** The `/prompts` page reads active prompt rows from `settings` table. `analyzeConversation()` accepts `promptOverrides?: Partial<Record<PromptKey, string>>` — operators can tune prompts without code changes.

---

## Analysis Pipeline (`src/lib/ai/analyze.ts`)

```
Input: AnalyzeInput {
  customerMessage: string
  context: ReplyContext          // language, emirate, offers, inventory, customer name
  images?: { mimeType, dataBase64 }[]
  promptOverrides?: Partial<Record<PromptKey, string>>
  claimEvidenceVerified?: boolean
  isCourierPromise?: boolean
  isSensitiveAction?: boolean
}

Step 1: buildContextMessages()
  → Assembles ChatMessage[] from system prompt + user context + customer message
  → Includes active offers, inventory state, customer history summary
  → Images appended as base64 content blocks when provided

Step 2: provider.complete(messages)
  → Calls configured AI provider
  → Returns raw string (may include markdown code fences)

Step 3: extractJson(rawOutput)
  → Strips markdown fences (```json ... ```)
  → Returns plain JSON string

Step 4: analysisSchema.parse(json)
  → Zod validation against AnalysisOutput schema (13 fields)
  → Throws ZodError on invalid output → 500 response with detail

Step 5: runGuardrails(reply, customerMessage, context, flags)
  → Pure function, no I/O
  → Returns GuardrailResult { findings, worstStatus, requiresHumanApproval, revisedReply? }

Output: AnalyzeResult {
  analysis: AnalysisOutput
  guardrails: GuardrailResult
  rawModelOutput: string
  provider: string
  model: string
}
```

---

## Output Schema (Zod-validated)

```typescript
AnalysisOutput {
  customer_intent: string              // e.g. "price inquiry for gold bracelet"
  lead_temperature: "cold"|"warm"|"hot"
  customer_persona: Persona            // 11 possible values
  product_identified: string
  name_check: string                   // how the AI interpreted customer name
  correct_arabic_name: string | null   // verified Arabic transliteration or null
  missing_information: string[]        // what the operator still needs to gather
  risk_or_caution: string[]            // flags for human review
  best_reply_to_send: string           // the drafted reply
  next_action: string
  follow_up_timing: string
  internal_sales_note: string          // operator-only, never sent to customer
  order_record_update: Record | null   // suggested DB update
  confidence_score: number             // 0.0–1.0
}
```

---

## Guardrail Engine (`src/lib/guardrails.ts`)

**Architecture:** Pure functions — zero I/O, zero side effects, fully unit-testable.

### Checks (in execution order)

| Code | §Ref | What it checks | Action on fail |
|---|---|---|---|
| `CLAIM_CONTROL` | §7 | Blocked phrases (real gold, waterproof, etc.) | FAIL + auto-reword |
| `PRIVACY_LEAK` | §14 | Phone numbers, addresses, payment refs in reply | FAIL |
| `PRICE_CONTROL` | §6 | Quoting a price without an active, unexpired offer | FAIL |
| `STOCK_CONTROL` | §8 | Unverified in-stock promise | WARN |
| `DELIVERY_CONTROL` | §10 | Same-day promise outside Dubai without courier confirm | FAIL |
| `PAYMENT_CONTROL` | §9 | Dispatch action before payment confirmed | FAIL |
| `VAT_CHECK` | §6/§9 | Quoting price without VAT line when applicable | WARN |
| `ARABIC_NAME` | §4 | Using unverified Arabic name transliteration | WARN |
| `LENGTH_CHECK` | §5 | Reply too long (> threshold chars) | WARN |
| `HUMAN_APPROVAL` | §24 | Sensitive actions requiring owner sign-off | requiresHumanApproval=true |

`worstStatus` is the maximum severity across all findings.  
`revisedReply` contains the auto-corrected reply when `CLAIM_CONTROL` rewrote blocked phrases.

---

## Human Approval Matrix (`src/lib/operations.ts`)

Actions that always require owner approval regardless of guardrail status:

- Refund decisions
- Dispute resolutions
- Supplier commitments
- Custom pricing deviations
- Any action on a locked order (active dispute)

The `requiresHumanApproval` flag in `GuardrailResult` drives the warning banner in `AnalysisPanel.tsx` and disables the "Approve" button until the owner explicitly acknowledges.

---

## AI Governance Controls

| Control | Implementation |
|---|---|
| No auto-send | Approve button requires manual click; no automated dispatch |
| Claim blocking | BLOCKED_CLAIMS patterns prevent false product assertions |
| Privacy protection | Phone/address/payment patterns blocked from replies |
| Human oversight | Approval matrix forces owner review on sensitive actions |
| Prompt versioning | Prompts stored in DB, overridable per-operator |
| Mock fallback | `AI_PROVIDER=mock` — safe, deterministic, no hallucination |
| Output validation | Zod schema on every model response |
| Audit log | Every analysis stored with `rawModelOutput` for traceability |
| No training on user data | Stateless API calls; no data sent back to model provider for training (confirm with provider ToS) |

---

## Known AI Risks and Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hallucinated price/stock | Medium | Guardrail PRICE_CONTROL + STOCK_CONTROL block unverified claims |
| Arabic name transliteration error | Medium | `arabic-names.ts` + ARABIC_NAME guardrail; falls back to أستاذة/أستاذ |
| Prompt injection via customer message | Low | System prompt separation; customer message is user-role only |
| Excessive reply length | Medium | LENGTH_CHECK guardrail warns operator |
| Provider outage | Low | `AI_PROVIDER=mock` always available as fallback |
| Sensitive data in model call | Low | Pre-check in intake UI before POST; guardrail post-check |
