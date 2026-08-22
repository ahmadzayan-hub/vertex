// POST /api/integrations/notebooklm/disconnect
// Revokes the token at Google (best-effort) and clears the local cookie store.

import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/integrations/notebooklm";
import { readTokens, clearTokens } from "@/lib/integrations/secure-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const tokens = await readTokens();
  if (tokens) {
    await revokeToken(tokens.refresh_token ?? tokens.access_token);
  }
  await clearTokens();
  return NextResponse.redirect(
    new URL("/integrations?notebooklm=disconnected", req.nextUrl.origin),
    { status: 303 }
  );
}
