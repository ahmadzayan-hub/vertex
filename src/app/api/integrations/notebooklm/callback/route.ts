// GET /api/integrations/notebooklm/callback
// Google redirects here after consent. We validate the state (CSRF), exchange
// the code for tokens, persist them encrypted, and bounce back to /integrations.

import { NextRequest, NextResponse } from "next/server";
import { notebookLmConfig, exchangeCodeForTokens } from "@/lib/integrations/notebooklm";
import { saveTokens, readState, clearState } from "@/lib/integrations/secure-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(req: NextRequest, status: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/integrations?notebooklm=${status}`, req.nextUrl.origin)
  );
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const error = params.get("error");
  if (error) {
    await clearState();
    return back(req, error === "access_denied" ? "denied" : "error");
  }

  const code = params.get("code");
  const returnedState = params.get("state");
  const expectedState = await readState();
  await clearState();

  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return back(req, "state_mismatch");
  }
  if (!code) {
    return back(req, "error");
  }

  const callback = new URL(
    "/api/integrations/notebooklm/callback",
    req.nextUrl.origin
  ).toString();
  const config = notebookLmConfig(callback);
  if (!config) {
    return back(req, "not_configured");
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    await saveTokens(tokens);
    return back(req, "connected");
  } catch {
    return back(req, "exchange_failed");
  }
}
