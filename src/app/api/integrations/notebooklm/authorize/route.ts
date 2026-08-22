// GET /api/integrations/notebooklm/authorize
// Kicks off the NotebookLM (Google) OAuth flow: mints an anti-CSRF state,
// stores it in an httpOnly cookie, and redirects to Google's consent screen.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { notebookLmConfig, buildAuthUrl } from "@/lib/integrations/notebooklm";
import { saveState } from "@/lib/integrations/secure-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function callbackUrl(req: NextRequest): string {
  return new URL("/api/integrations/notebooklm/callback", req.nextUrl.origin).toString();
}

export async function GET(req: NextRequest) {
  const config = notebookLmConfig(callbackUrl(req));
  if (!config) {
    return NextResponse.redirect(
      new URL("/integrations?notebooklm=not_configured", req.nextUrl.origin)
    );
  }

  const state = randomBytes(24).toString("base64url");
  await saveState(state);

  return NextResponse.redirect(buildAuthUrl(config, state));
}
