import type { S } from '@/types/api';

const KEY = 'qoot.labor.session';

export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

let memory: StoredSession | null = null;

function read(): StoredSession | null {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    memory = null;
  }
  return memory;
}

export const tokenStorage = {
  get: read,
  set(tokens: S<'TokenResponse'>) {
    memory = {
      accessToken: tokens.accessToken ?? '',
      accessTokenExpiresAt: tokens.accessTokenExpiresAt ?? '',
      refreshToken: tokens.refreshToken ?? '',
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt ?? '',
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(memory));
    } catch {
      /* storage unavailable: session stays in memory only */
    }
  },
  clear() {
    memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
  hasRefreshToken(): boolean {
    const s = read();
    if (!s?.refreshToken) return false;
    return !s.refreshTokenExpiresAt || new Date(s.refreshTokenExpiresAt).getTime() > Date.now();
  },
};
