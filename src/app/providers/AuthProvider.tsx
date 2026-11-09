import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser } from './authContext';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/features/authentication/api';
import { onAccessGate, onSessionExpired } from '@/services/api/client';
import { tokenStorage } from '@/services/api/tokenStorage';
import i18n, { normalizeLanguage } from '@/i18n';
import { hasAnyPermission } from '@/constants/permissions';

type User = AuthUser;
type Status = 'loading' | 'authenticated' | 'anonymous';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>(tokenStorage.get() ? 'loading' : 'anonymous');
  const [user, setUser] = useState<User | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const applyUser = useCallback((u: User) => {
    setUser(u);
    setStatus('authenticated');
    setSessionExpired(false);
    const lang = normalizeLanguage(u.language);
    if (lang && lang !== i18n.language) void i18n.changeLanguage(lang);
  }, []);

  const reload = useCallback(async () => {
    const u = await authApi.me();
    applyUser(u);
  }, [applyUser]);

  useEffect(() => {
    if (!tokenStorage.get()) return;
    reload().catch(() => {
      tokenStorage.clear();
      setStatus('anonymous');
    });
  }, [reload]);

  // A 403 PASSWORD_CHANGE_REQUIRED / ASSIGNMENT_APPROVAL_REQUIRED on any request means the account
  // state changed (e.g. a letter was returned): re-read auth/me so the route guard shows the right
  // screen. Several failing requests at once trigger one reload.
  const gateReload = useRef<Promise<void> | null>(null);
  useEffect(() => {
    const unsubscribe = onAccessGate(() => {
      if (gateReload.current || !tokenStorage.get()) return;
      gateReload.current = reload()
        .catch(() => undefined)
        .finally(() => {
          gateReload.current = null;
        });
    });
    return () => {
      unsubscribe();
    };
  }, [reload]);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setUser(null);
      setStatus('anonymous');
      setSessionExpired(true);
      queryClient.clear();
    });
    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const login = useCallback(
    async (userName: string, password: string) => {
      const tokens = await authApi.login({ userName, password });
      tokenStorage.set(tokens);
      const u = await authApi.me();
      applyUser(u);
      return u;
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.get()?.refreshToken;
    try {
      if (refreshToken) await authApi.logout({ refreshToken });
    } catch {
      /* session is cleared locally regardless */
    }
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
    setStatus('anonymous');
  }, [queryClient]);

  const can = useCallback(
    (codes?: readonly string[]) => {
      if (!codes || codes.length === 0) return true;
      if (!user) return false;
      if (user.isSuperAdmin) return true;
      return hasAnyPermission(user.permissions, codes);
    },
    [user],
  );

  const value = useMemo(
    () => ({ status, user, sessionExpired, login, logout, reload, can }),
    [status, user, sessionExpired, login, logout, reload, can],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
