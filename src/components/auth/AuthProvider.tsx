import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

import { supabase } from '@/utils/supabase';
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth';
import type { LoginResult, VertexUser } from '@/types';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<VertexUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error) {
      console.warn('[VERTEX] Failed to load user profile:', error.message);
      setProfile(null);
      return;
    }
    setProfile((data as VertexUser | null) ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };

      // Best-effort last_login update - never blocks the login.
      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        void supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', u.user.id);
      }
      return { ok: true };
    },
    [],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, session, loading, login, logout }),
    [user, profile, session, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
