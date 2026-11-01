import { createContext, useContext } from 'react';
import type { S } from '@/types/api';

export type AuthUser = S<'CurrentUserResponse'>;

export interface AuthContextValue {
  status: 'loading' | 'authenticated' | 'anonymous';
  user: AuthUser | null;
  sessionExpired: boolean;
  login: (userName: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  /** True when the user is super admin or holds any permission matching one of the codes/prefixes. */
  can: (codes?: readonly string[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
