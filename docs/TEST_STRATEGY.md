# Test Strategy — مسار (Masaar)

## Current State

| Test type | Framework | Count | Status |
|---|---|---|---|
| Unit — guardrail engine | Vitest 3 | 20 tests | PASSING |
| Unit — OAuth/crypto | Vitest 3 | 11 tests | PASSING |
| Integration — /api/analyze | — | 0 | GAP |
| End-to-end | — | 0 | GAP |
| Visual regression | — | 0 | GAP |
| Accessibility automated | — | 0 | GAP |

**Total: 31 unit tests passing, 0 integration/E2E tests.**

---

## Existing Unit Tests

### `tests/guardrails.test.ts` (20 tests)

Business-scenario coverage of the guardrail engine (§30 spec):

| Test | Scenario |
|---|---|
| Real gold claim blocked | Detects "real gold" / "ذهب حقيقي" in reply → FAIL |
| Waterproof claim blocked | Detects "waterproof" → FAIL + auto-reword |
| Privacy leak blocked | UAE phone number in reply → FAIL |
| Unverified stock blocked | "In stock" without stock flag → WARN |
| Same-day Sharjah blocked | Same-day delivery outside Dubai without courier confirm → FAIL |
| Dispatch before payment | Courier dispatch when payment not confirmed → FAIL |
| VAT math | `buildTotalBreakdown()` computes correct net/VAT/total |
| Arabic name — Rehab | Detects Rehab → maps to رحاب |
| Arabic name — Kay | Keeps "Kay" as-is (no Arabic equivalent) |
| Arabic name — unknown | Falls back to أستاذة/أستاذ |
| QC gating | `buildQcChecklist()` requires photo + packaging check before dispatch |
| Approval matrix — refund | Refund decision requires human approval flag |
| Fraud signals | Unusual urgency + new account → fraud_risk signal |
| Price control | No active offer → price quote blocked |
| Name in reply | Unverified Arabic transliteration in reply → WARN |
| Material claim auto-reword | "luxury material" reworded to "premium fashion accessory" |
| Length check | Reply > 300 chars → WARN |
| Anti-tarnish claim | "anti-tarnish" blocked |
| Original brand claim | "original brand" blocked |
| Delivery window | Dubai = 0–1 day; Fujairah = 2–3 days |

### `tests/notebooklm-oauth.test.ts` (11 tests)

| Test | Coverage |
|---|---|
| buildAuthUrl | Returns correct Google OAuth URL with all required params |
| buildAuthUrl — no scopes env | Falls back to default scopes |
| CSRF state | State is a non-empty random string |
| Token encryption round-trip | AES-256-GCM encrypt → decrypt returns original token |
| Token encryption — wrong key | Decryption fails with wrong key |
| refreshToken | Token refresh returns new access_token |
| revokeToken | Revocation calls correct Google endpoint |
| buildRedirectUri — env set | Uses GOOGLE_OAUTH_REDIRECT_URI env |
| buildRedirectUri — env absent | Derives URI from request origin |
| Config validation | Missing GOOGLE_OAUTH_CLIENT_ID throws |
| Config validation — no secret | Missing GOOGLE_OAUTH_CLIENT_SECRET throws |

---

## Testing Gaps

### Gap 1: No integration tests for `/api/analyze`

**Risk:** Breaking changes to the AI pipeline (context assembly, Zod schema, guardrail integration) go undetected until manual testing.

**Recommended test:**
```typescript
// tests/api-analyze.test.ts
test("analyze endpoint returns guardrail result for real-gold claim", async () => {
  const res = await fetch("http://localhost:3000/api/analyze", {
    method: "POST",
    body: JSON.stringify({
      customerMessage: "هل الإسوارة ذهب حقيقي؟",
      context: { language: "ar", ... }
    })
  });
  const data = await res.json();
  expect(data.guardrails.findings.some(f => f.code === "CLAIM_CONTROL")).toBe(true);
});
```

### Gap 2: No E2E tests

**Risk:** Critical intake flow, auth redirect, and mobile layout regressions undetected.

**Recommended E2E suite (Playwright):**

1. Demo mode — intake flow completes without Supabase or API key
2. Auth redirect — unauthenticated request → /login page
3. Inbox filter — filter by "ساخن" → shows only hot leads
4. Arabic RTL — heading direction is RTL on all pages
5. Mobile layout — 390px viewport, nav collapses, intake form usable
6. Guardrail FAIL state — real gold claim → Approve button disabled
7. Copy reply — click "نسخ" → clipboard populated

### Gap 3: No accessibility automated tests

**Risk:** WCAG regressions in heading hierarchy, contrast, form labels.

**Recommended:** Add `@axe-core/playwright` to E2E suite, run on `/`, `/intake`, `/inbox` at minimum.

### Gap 4: No visual regression tests

**Risk:** UI regressions at different breakpoints undetected.

**Recommended:** Playwright screenshots at 390px, 768px, 1440px for dashboard, intake, and inbox.

---

## Recommended Test Infrastructure

```bash
# Add to package.json scripts
"test:e2e": "playwright test",
"test:a11y": "playwright test --project=a11y",
"test:all": "vitest run && playwright test"
```

```bash
# Install
npm install --save-dev @playwright/test @axe-core/playwright
```

Playwright config: target `http://localhost:3000`, use demo mode (no Supabase env needed), run in `chromium` headless.

---

## CI Integration

See `.github/workflows/ci.yml` (created on improvement branch):

- `npm ci` → `npm run typecheck` → `npm run test` → `npm run build`
- Runs on every PR to main
- Fails the PR if any step fails
- No secrets required (builds in mock mode)

---

## Test Data Policy

- Unit test fixtures are self-contained in test files — no real customer data
- Demo universe (`src/lib/demo/seed.ts`) uses fictional names and synthesised data
- No production data is used in tests
- Sanitised scenarios in `tests/guardrails.test.ts` model real business rules without real PII
