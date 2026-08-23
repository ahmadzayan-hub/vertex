import { createContext, useContext } from 'react';
import type { AuthState, LoginResult } from '@/types';

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
