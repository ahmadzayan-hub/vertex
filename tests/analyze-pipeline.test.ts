import { describe, it, expect } from "vitest";
import { parseAnalysis } from "../src/lib/ai/analyze";
import { computeDailyMetrics, deterministicNarrative } from "../src/lib/daily-review";
import {
  computeVelocity,
  evaluateVip,
  isOrderLocked,
  selectTestimonials,
  expectedDeliveryWindow,
  buildVatCsv,
} from "../src/lib/growth";

// ── Minimal valid analysis fixture ─────────────────────────────────────────
const VALID_ANALYSIS = {
  customer_intent: "wants to order a bracelet",
  lead_temperature: "hot",
  customer_persona: "hot_lead",
  product_identified: "bracelet",
  name_check: "ok",
  correct_arabic_name: null,
  missing_information: [],
  risk_or_caution: [],
  best_reply_to_send: "شكراً على اهتمامك",
  next_action: "send payment link",
  follow_up_timing: "2 hours",
  internal_sales_note: "ready to buy",
  order_record_update: null,
  confidence_score: 0.9,
};

// ── parseAnalysis ───────────────────────────────────────────────────────────
describe("parseAnalysis", () => {
  it("parses valid JSON string", () => {
    const result = parseAnalysis(JSON.stringify(VALID_ANALYSIS));
    expect(result.lead_temperature).toBe("hot");
    expect(result.confidence_score).toBe(0.9);
  });

  it("parses JSON wrapped in markdown code fence", () => {
    const raw = "```json\n" + JSON.stringify(VALID_ANALYSIS) + "\n```";
    const result = parseAnalysis(raw);
    expect(result.customer_intent).toBe("wants to order a bracelet");
  });

  it("parses JSON wrapped in plain code fence", () => {
    const raw = "```\n" + JSON.stringify(VALID_ANALYSIS) + "\n```";
    const result = parseAnalysis(raw);
    expect(result.lead_temperature).toBe("hot");
  });

  it("parses JSON embedded in surrounding prose", () => {
    const raw = "Here is the analysis: " + JSON.stringify(VALID_ANALYSIS) + " end.";
    const result = parseAnalysis(raw);
    expect(result.product_identified).toBe("bracelet");
  });

  it("throws when raw string is not JSON", () => {
    expect(() => parseAnalysis("not json at all")).toThrow("Model did not return valid JSON");
  });

  it("throws when JSON fails Zod schema (missing required field)", () => {
    const bad = { ...VALID_ANALYSIS };
    // @ts-expect-error intentional mutation for test
    delete bad.best_reply_to_send;
    expect(() => parseAnalysis(JSON.stringify(bad))).toThrow();
  });

  it("throws on invalid lead_temperature enum value", () => {
    const bad = { ...VALID_ANALYSIS, lead_temperature: "scorching" };
    expect(() => parseAnalysis(JSON.stringify(bad))).toThrow();
  });

  it("throws when confidence_score is out of range", () => {
    const bad = { ...VALID_ANALYSIS, confidence_score: 1.5 };
    expect(() => parseAnalysis(JSON.stringify(bad))).toThrow();
  });
});

// ── computeDailyMetrics ─────────────────────────────────────────────────────
const TODAY = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000 * 2).toISOString();

describe("computeDailyMetrics", () => {
  it("counts only today's orders and conversations", () => {
    const orders = [
      { created_at: TODAY, payment_status: "confirmed", total_amount: "200", product_name: "bracelet", delivery_area: "Dubai", order_status: "delivered" },
      { created_at: YESTERDAY, payment_status: "confirmed", total_amount: "100", product_name: "ring", delivery_area: "Sharjah", order_status: "delivered" },
    ];
    const convs = [
      { created_at: TODAY, lead_temperature: "hot", stage: "active" },
      { created_at: YESTERDAY, lead_temperature: "cold", stage: "lost_lead" },
    ];
    const m = computeDailyMetrics(orders, convs);
    expect(m.todayOrders).toBe(1);
    expect(m.todayPaidAed).toBe(200);
    expect(m.todayConversations).toBe(1);
    expect(m.todayHotLeads).toBe(1);
    expect(m.todayLost).toBe(0);
  });

  it("returns zeros when no data matches today", () => {
    const m = computeDailyMetrics(
      [{ created_at: YESTERDAY, payment_status: "confirmed", total_amount: "100", product_name: "x", delivery_area: "Dubai", order_status: "delivered" }],
      []
    );
    expect(m.todayOrders).toBe(0);
    expect(m.todayPaidAed).toBe(0);
    expect(m.todayConversations).toBe(0);
    expect(m.conversionPercent).toBe(0);
  });

  it("computes topProduct and topEmirate from paid orders", () => {
    const orders = [
      { created_at: TODAY, payment_status: "confirmed", total_amount: "100", product_name: "bracelet", delivery_area: "Dubai", order_status: "delivered" },
      { created_at: TODAY, payment_status: "confirmed", total_amount: "100", product_name: "bracelet", delivery_area: "Sharjah", order_status: "delivered" },
      { created_at: TODAY, payment_status: "confirmed", total_amount: "100", product_name: "ring", delivery_area: "Dubai", order_status: "delivered" },
    ];
    const m = computeDailyMetrics(orders, []);
    expect(m.topProduct).toBe("bracelet");
    expect(m.topEmirate).toBe("Dubai");
  });

  it("counts todayPendingAed from link_sent and needs_verification", () => {
    const orders = [
      { created_at: TODAY, payment_status: "link_sent", total_amount: "150", product_name: "x", delivery_area: "Dubai", order_status: "pending" },
      { created_at: TODAY, payment_status: "needs_verification", total_amount: "50", product_name: "y", delivery_area: "Dubai", order_status: "pending" },
    ];
    const m = computeDailyMetrics(orders, []);
    expect(m.todayPendingAed).toBe(200);
    expect(m.todayPaidAed).toBe(0);
  });

  it("counts todayComplaints", () => {
    const orders = [
      { created_at: TODAY, payment_status: "confirmed", total_amount: "100", product_name: "x", delivery_area: "Dubai", order_status: "complaint" },
    ];
    const m = computeDailyMetrics(orders, []);
    expect(m.todayComplaints).toBe(1);
  });

  it("computes conversionPercent from paid / conversations", () => {
    const orders = [
      { created_at: TODAY, payment_status: "confirmed", total_amount: "100", product_name: "x", delivery_area: "Dubai", order_status: "delivered" },
    ];
    const convs = [
      { created_at: TODAY, lead_temperature: "hot", stage: "active" },
      { created_at: TODAY, lead_temperature: "warm", stage: "active" },
      { created_at: TODAY, lead_temperature: "cold", stage: "active" },
      { created_at: TODAY, lead_temperature: "cold", stage: "active" },
    ];
    const m = computeDailyMetrics(orders, convs);
    expect(m.conversionPercent).toBe(25);
  });
});

// ── deterministicNarrative ─────────────────────────────────────────────────
describe("deterministicNarrative", () => {
  const baseMetrics = {
    todayOrders: 3,
    todayPaidAed: 600,
    todayPendingAed: 150,
    todayConversations: 10,
    todayHotLeads: 2,
    todayLost: 0,
    todayComplaints: 0,
    topProduct: "bracelet",
    topEmirate: "Dubai",
    avgOrderAed: 200,
    conversionPercent: 30,
  };

  it("returns both en and ar strings", () => {
    const { en, ar } = deterministicNarrative(baseMetrics);
    expect(typeof en).toBe("string");
    expect(typeof ar).toBe("string");
    expect(en.length).toBeGreaterThan(0);
    expect(ar.length).toBeGreaterThan(0);
  });

  it("includes topProduct in narrative", () => {
    const { en, ar } = deterministicNarrative(baseMetrics);
    expect(en).toContain("bracelet");
    expect(ar).toContain("bracelet");
  });

  it("mentions complaints when present", () => {
    const { en, ar } = deterministicNarrative({ ...baseMetrics, todayComplaints: 2 });
    expect(en).toContain("complaint");
    expect(ar).toContain("شكو");
  });

  it("mentions lost leads when present", () => {
    const { en, ar } = deterministicNarrative({ ...baseMetrics, todayLost: 1 });
    expect(en).toContain("lost");
    expect(ar).toContain("محتمل");
  });

  it("uses fallback text when no topProduct", () => {
    const { en } = deterministicNarrative({ ...baseMetrics, topProduct: null, topEmirate: null });
    expect(en).toContain("hot leads");
  });

  it("includes conversion rate", () => {
    const { en } = deterministicNarrative(baseMetrics);
    expect(en).toContain("30%");
  });
});

// ── computeVelocity ─────────────────────────────────────────────────────────
describe("computeVelocity", () => {
  it("returns 'out' status when quantity is 0", () => {
    const r = computeVelocity({ quantityAvailable: 0, dailySalesRate: 2 });
    expect(r.status).toBe("out");
    expect(r.daysToStockout).toBe(0);
    expect(r.reorderSuggested).toBe(true);
  });

  it("returns 'ok' with null daysToStockout when no sales velocity", () => {
    const r = computeVelocity({ quantityAvailable: 50, dailySalesRate: 0 });
    expect(r.status).toBe("ok");
    expect(r.daysToStockout).toBeNull();
    expect(r.reorderSuggested).toBe(false);
  });

  it("returns 'critical' when days to stockout <= half of lead days", () => {
    // lead default=7, half=3.5 → ceil=4; 3 days stock = critical
    const r = computeVelocity({ quantityAvailable: 3, dailySalesRate: 1 });
    expect(r.status).toBe("critical");
    expect(r.reorderSuggested).toBe(true);
    expect(r.suggestedReorderQty).toBeGreaterThan(0);
  });

  it("returns 'low' when days to stockout <= 2x lead days", () => {
    // lead=7, 2x=14; 10 days stock and daily rate 1 → 10 days → low
    const r = computeVelocity({ quantityAvailable: 10, dailySalesRate: 1 });
    expect(r.status).toBe("low");
    expect(r.reorderSuggested).toBe(true);
  });

  it("returns 'ok' when well-stocked", () => {
    const r = computeVelocity({ quantityAvailable: 100, dailySalesRate: 1 });
    expect(r.status).toBe("ok");
    expect(r.reorderSuggested).toBe(false);
    expect(r.suggestedReorderQty).toBe(0);
  });

  it("respects custom reorderLeadDays", () => {
    // lead=3, 2x=6; 5 days stock → low
    const r = computeVelocity({ quantityAvailable: 5, dailySalesRate: 1, reorderLeadDays: 3 });
    expect(r.status).toBe("low");
  });
});

// ── evaluateVip ─────────────────────────────────────────────────────────────
describe("evaluateVip", () => {
  it("returns 'new' tier for first purchase", () => {
    const r = evaluateVip(1);
    expect(r.tier).toBe("new");
    expect(r.isVip).toBe(false);
    expect(r.loyaltyMention).toBeNull();
  });

  it("returns 'repeat' tier for second purchase", () => {
    const r = evaluateVip(2);
    expect(r.tier).toBe("repeat");
    expect(r.isVip).toBe(false);
    expect(r.loyaltyMention).not.toBeNull();
  });

  it("returns 'vip' tier at 3+ purchases", () => {
    const r3 = evaluateVip(3);
    const r10 = evaluateVip(10);
    expect(r3.isVip).toBe(true);
    expect(r3.tier).toBe("vip");
    expect(r10.isVip).toBe(true);
    expect(r3.loyaltyMention?.en).toBeTruthy();
    expect(r3.loyaltyMention?.ar).toBeTruthy();
  });
});

// ── isOrderLocked ──────────────────────────────────────────────────────────
describe("isOrderLocked", () => {
  it("returns true when any dispute is open", () => {
    expect(isOrderLocked([{ status: "open" }])).toBe(true);
  });

  it("returns true when any dispute is in_review", () => {
    expect(isOrderLocked([{ status: "resolved" }, { status: "in_review" }])).toBe(true);
  });

  it("returns false when all disputes are resolved or rejected", () => {
    expect(isOrderLocked([{ status: "resolved" }, { status: "rejected" }])).toBe(false);
  });

  it("returns false for empty dispute list", () => {
    expect(isOrderLocked([])).toBe(false);
  });
});

// ── expectedDeliveryWindow ─────────────────────────────────────────────────
describe("expectedDeliveryWindow", () => {
  const base = new Date("2026-01-15T10:00:00Z");

  it("returns same-day/next-day for Dubai and no courier confirm required", () => {
    const r = expectedDeliveryWindow("dubai", base);
    expect(r.requiresCourierConfirm).toBe(false);
    expect(r.from.toISOString().slice(0, 10)).toBe("2026-01-15");
    expect(r.to.toISOString().slice(0, 10)).toBe("2026-01-16");
  });

  it("returns courier confirm required for Sharjah", () => {
    const r = expectedDeliveryWindow("sharjah", base);
    expect(r.requiresCourierConfirm).toBe(true);
    expect(r.label).toContain("بانتظار تأكيد");
  });

  it("is case-insensitive for emirate name", () => {
    const r1 = expectedDeliveryWindow("Dubai", base);
    const r2 = expectedDeliveryWindow("DUBAI", base);
    expect(r1.requiresCourierConfirm).toBe(false);
    expect(r2.requiresCourierConfirm).toBe(false);
  });

  it("uses 2–4 day fallback for unknown emirate", () => {
    const r = expectedDeliveryWindow("outer space", base);
    expect(r.from.toISOString().slice(0, 10)).toBe("2026-01-17");
    expect(r.to.toISOString().slice(0, 10)).toBe("2026-01-19");
    expect(r.requiresCourierConfirm).toBe(true);
  });

  it("uses fallback for null emirate", () => {
    const r = expectedDeliveryWindow(null, base);
    expect(r.requiresCourierConfirm).toBe(true);
  });

  it("returns a label string containing the dates", () => {
    const r = expectedDeliveryWindow("dubai", base);
    expect(r.label).toContain("2026-01-15");
  });
});

// ── buildVatCsv ────────────────────────────────────────────────────────────
describe("buildVatCsv", () => {
  it("produces correct header row", () => {
    const csv = buildVatCsv([]);
    const header = csv.split("\n")[0];
    expect(header).toBe("order_id,date,description,net_amount_aed,vat_amount_aed,total_amount_aed,payment_status");
  });

  it("produces one data row per order", () => {
    const orders = [
      { id: "ORD-1", created_at: "2026-06-01T12:00:00Z", product_summary: "bracelet", product_price: 79, delivery_cost: 15, vat_amount: 4.7, total_amount: 98.7, payment_status: "confirmed" },
      { id: "ORD-2", created_at: "2026-06-02T09:00:00Z", product_summary: "ring", product_price: 120, delivery_cost: 0, vat_amount: 6, total_amount: 126, payment_status: "confirmed" },
    ];
    const lines = buildVatCsv(orders).split("\n");
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain("ORD-1");
    expect(lines[1]).toContain("2026-06-01");
    expect(lines[2]).toContain("ORD-2");
  });

  it("computes net_amount as product_price + delivery_cost", () => {
    const orders = [{ id: "X", created_at: "2026-01-01T00:00:00Z", product_price: 100, delivery_cost: 20, vat_amount: 6, total_amount: 126, payment_status: "confirmed" }];
    const csv = buildVatCsv(orders);
    const row = csv.split("\n")[1];
    expect(row).toContain("120.00"); // net
    expect(row).toContain("6.00");   // vat
    expect(row).toContain("126.00"); // total
  });

  it("escapes commas in product_summary with double-quotes", () => {
    const orders = [{ id: "Y", created_at: "2026-01-01T00:00:00Z", product_summary: "gold, silver", product_price: 50, delivery_cost: 0, vat_amount: 2.5, total_amount: 52.5, payment_status: "confirmed" }];
    const row = buildVatCsv(orders).split("\n")[1];
    expect(row).toContain('"gold, silver"');
  });

  it("handles missing optional fields gracefully", () => {
    const orders = [{ id: "Z", created_at: "2026-01-01T00:00:00Z" }];
    const row = buildVatCsv(orders).split("\n")[1];
    expect(row).toContain("Z");
    expect(row).toContain("0.00");
  });
});

// ── selectTestimonials ─────────────────────────────────────────────────────
describe("selectTestimonials", () => {
  const reviews = [
    { id: "r1", order_id: "o1", rating: 5, feedback: "Great!", permission_to_share: true },
    { id: "r2", order_id: "o2", rating: 4, feedback: "Good", permission_to_share: true },
    { id: "r3", order_id: null, rating: 5, feedback: "Amazing", permission_to_share: true },   // no order_id → excluded
    { id: "r4", order_id: "o4", rating: 5, feedback: "Excellent", permission_to_share: false }, // no permission → excluded
    { id: "r5", order_id: "o5", rating: 3, feedback: "Ok", permission_to_share: true },         // rating < 4 → excluded
    { id: "r6", order_id: "o6", rating: 5, feedback: "   ", permission_to_share: true },        // blank feedback → excluded
  ];

  it("filters out reviews without order_id, permission, or sufficient rating", () => {
    const result = selectTestimonials(reviews);
    const ids = result.map((r) => r.id);
    expect(ids).toContain("r1");
    expect(ids).toContain("r2");
    expect(ids).not.toContain("r3");
    expect(ids).not.toContain("r4");
    expect(ids).not.toContain("r5");
    expect(ids).not.toContain("r6");
  });

  it("sorts by descending rating", () => {
    const result = selectTestimonials(reviews);
    expect(result[0].id).toBe("r1"); // rating 5 before rating 4
  });

  it("respects the limit parameter", () => {
    const result = selectTestimonials(reviews, 1);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no reviews qualify", () => {
    expect(selectTestimonials([])).toHaveLength(0);
    expect(selectTestimonials([{ id: "x", order_id: null, rating: 1, feedback: null, permission_to_share: false }])).toHaveLength(0);
  });
});
