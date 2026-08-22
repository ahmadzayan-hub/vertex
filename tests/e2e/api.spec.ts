// E2E: /api/analyze — rate limiting and response shape.
import { test, expect } from "@playwright/test";

const ANALYZE_URL = "/api/analyze";
const VALID_BODY = {
  customerMessage: "كم سعر الطوق؟",
  context: {
    platform: "instagram",
    language: "ar",
    customerNameDisplay: null,
    customerNameArabicVerified: null,
    emirate: null,
    quotedPrice: null,
    quotedDeliveryCost: null,
    vatApplicable: false,
    paymentStatus: "none",
    courierConfirmed: false,
    stockKnownAvailable: false,
    isCourierPromise: false,
    isSensitiveAction: false,
    claimEvidenceVerified: false,
    activeOffers: [],
    inventory: [],
  },
};

test.describe("POST /api/analyze", () => {
  test("returns 400 for missing body fields", async ({ request }) => {
    const res = await request.post(ANALYZE_URL, { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("returns 400 for invalid JSON", async ({ request }) => {
    const res = await request.post(ANALYZE_URL, {
      headers: { "Content-Type": "application/json" },
      data: "not-json",
    });
    expect(res.status()).toBe(400);
  });

  test("returns 200 with mock provider and correct shape", async ({ request }) => {
    const res = await request.post(ANALYZE_URL, { data: VALID_BODY });
    expect(res.status()).toBe(200);

    const body = await res.json();
    // Must have analysis and guardrails fields
    expect(body).toHaveProperty("analysis");
    expect(body).toHaveProperty("guardrails");
    expect(body.guardrails).toHaveProperty("findings");
    expect(Array.isArray(body.guardrails.findings)).toBe(true);
  });

  test("returns X-RateLimit headers", async ({ request }) => {
    const res = await request.post(ANALYZE_URL, { data: VALID_BODY });
    expect(res.status()).toBe(200);
    expect(res.headers()["x-ratelimit-limit"]).toBe("30");
    expect(res.headers()["x-ratelimit-remaining"]).toBeTruthy();
  });

  test("returns 429 after exceeding rate limit", async ({ request }) => {
    // Fire 31 requests rapidly — the 31st should be rate-limited
    // Use a unique X-Forwarded-For header so this test doesn't pollute the shared IP window
    const headers = { "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200) + 1}` };
    let rateLimited = false;

    for (let i = 0; i < 31; i++) {
      const res = await request.post(ANALYZE_URL, { data: VALID_BODY, headers });
      if (res.status() === 429) {
        rateLimited = true;
        // Retry-After header must be present
        expect(res.headers()["retry-after"]).toBeTruthy();
        break;
      }
    }

    expect(rateLimited).toBe(true);
  });
});
