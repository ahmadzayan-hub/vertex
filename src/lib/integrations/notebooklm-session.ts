// Server-side glue between the NotebookLM OAuth helpers and the cookie store.
// Keeps route handlers and pages thin: they ask for connection status or a
// fresh access token and this module handles refresh + persistence.

import {
  notebookLmConfig,
  refreshAccessToken,
  isExpired,
  type OAuthTokens,
} from "./notebooklm";
import { readTokens, saveTokens } from "./secure-store";

export interface NotebookLmStatus {
  configured: boolean; // env present
  connected: boolean; // tokens stored
  scopes: string[];
  expiresAt: number | null;
}

/** Cheap, read-only status for rendering the integrations UI. */
export async function getNotebookLmStatus(): Promise<NotebookLmStatus> {
  const configured = notebookLmConfig("https://placeholder.local/callback") !== null;
  const tokens = await readTokens();
  return {
    configured,
    connected: !!tokens,
    scopes: tokens?.scope ? tokens.scope.split(/\s+/).filter(Boolean) : [],
    expiresAt: tokens?.expires_at ?? null,
  };
}

/**
 * Return a valid access token for calling Google APIs on the owner's behalf,
 * transparently refreshing (and re-persisting) when the current one is expired.
 * Returns null when not configured or not connected.
 */
export async function getValidAccessToken(
  fallbackRedirectUri?: string
): Promise<OAuthTokens | null> {
  const config = notebookLmConfig(fallbackRedirectUri);
  if (!config) return null;

  const tokens = await readTokens();
  if (!tokens) return null;

  if (!isExpired(tokens)) return tokens;
  if (!tokens.refresh_token) return tokens; // can't refresh; let caller handle 401

  const refreshed = await refreshAccessToken(config, tokens.refresh_token);
  await saveTokens(refreshed);
  return refreshed;
}
