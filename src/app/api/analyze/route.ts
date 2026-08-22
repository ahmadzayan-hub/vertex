// POST /api/analyze — runs the AI analysis + guardrail pipeline.
// Body: { customerMessage, context, images?, claimEvidenceVerified?, isCourierPromise?, isSensitiveAction? }
// Returns the structured AnalysisOutput + guardrail findings for operator review.

import { NextRequest, NextResponse } from "next/server";
import { analyzeConversation, AnalyzeInput } from "@/lib/ai/analyze";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Sliding-window rate limiter — in-process, no external dependencies.
// Resets on cold start (acceptable for a single-operator console).
// Limit: WINDOW_MAX requests per WINDOW_MS per IP.
// ---------------------------------------------------------------------------
const WINDOW_MS = 60_000; // 1 minute
const WINDOW_MAX = 30; // 30 requests / min / IP is generous for a human, low for a bot

const windows = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const hits = (windows.get(ip) ?? []).filter((t) => t > cutoff);
  hits.push(now);
  windows.set(ip, hits);

  // Prune the map periodically to avoid unbounded growth
  if (windows.size > 5_000) {
    for (const [key, ts] of windows) {
      if (ts.every((t) => t <= cutoff)) windows.delete(key);
    }
  }

  const remaining = Math.max(0, WINDOW_MAX - hits.length);
  const oldest = hits[0] ?? now;
  const resetMs = oldest + WINDOW_MS - now;
  return { allowed: hits.length <= WINDOW_MAX, remaining, resetMs };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const { allowed, remaining, resetMs } = checkRateLimit(ip);

  if (!allowed) {
    console.warn(`[analyze] rate-limited ip=${ip}`);
    return NextResponse.json(
      { error: "Too many requests — please wait before submitting again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(resetMs / 1_000)),
          "X-RateLimit-Limit": String(WINDOW_MAX),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + resetMs) / 1_000)),
        },
      }
    );
  }

  let body: AnalyzeInput;
  try {
    body = (await req.json()) as AnalyzeInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.customerMessage || !body?.context) {
    return NextResponse.json(
      { error: "customerMessage and context are required" },
      { status: 400 }
    );
  }

  const start = Date.now();
  try {
    const result = await analyzeConversation(body);
    const latencyMs = Date.now() - start;
    const worstStatus = result.guardrails?.findings?.reduce(
      (w: string, g: { status: string }) =>
        g.status === "fail" ? "fail" : w === "fail" ? "fail" : g.status === "warn" ? "warn" : w,
      "pass"
    );
    console.error(
      `[analyze] ok latency=${latencyMs}ms provider=${process.env.AI_PROVIDER ?? "unknown"} guardrail=${worstStatus} ip=${ip} remaining=${remaining}`
    );
    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Limit": String(WINDOW_MAX),
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error(
      `[analyze] error latency=${latencyMs}ms provider=${process.env.AI_PROVIDER ?? "unknown"} err=${message} ip=${ip}`
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
