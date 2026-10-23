import { afterEach, describe, it, expect, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('supabase client config', () => {
  it('does not throw when the env vars are set but empty (regression: white screen)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mod = await import('@/utils/supabase');
    expect(mod.isSupabaseConfigured).toBe(false);
    expect(mod.supabase).toBeDefined();
  });

  it('reports configured when both values are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    const mod = await import('@/utils/supabase');
    expect(mod.isSupabaseConfigured).toBe(true);
  });
});
