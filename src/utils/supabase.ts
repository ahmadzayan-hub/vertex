import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when both Supabase env vars are present at build time. When false the
 * client below still exists (so imports never crash), but every network call
 * will fail, and the UI says so instead of showing a misleading error.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // Surface configuration problems early - the app cannot work without these.
  console.error(
    '[VERTEX] Missing Supabase env vars. Copy .env.example to .env.local and fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'vertex.auth',
    },
  },
);
