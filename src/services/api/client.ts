import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { S } from '@/types/api';
import { tokenStorage } from './tokenStorage';

const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
export const API_PREFIX = `${base}/api/v1`;

/** Drops empty values so optional filters are not sent. */
function serializeParams(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)));
    else sp.append(key, String(value));
  });
  return sp.toString();
}

export const http = axios.create({
  baseURL: API_PREFIX,
  paramsSerializer: { serialize: serializeParams },
  headers: { Accept: 'application/json' },
});

let currentLanguage = 'ar';
export function setApiLanguage(lang: string) {
  currentLanguage = lang;
}

type SessionListener = () => void;
const expiredListeners = new Set<SessionListener>();
export function onSessionExpired(listener: SessionListener) {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

http.interceptors.request.use((config) => {
  const session = tokenStorage.get();
  if (session?.accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  config.headers['Accept-Language'] = currentLanguage;
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const session = tokenStorage.get();
  if (!session?.refreshToken) return false;
  try {
    const { data } = await axios.post<S<'TokenResponse'>>(
      `${API_PREFIX}/auth/refresh`,
      { refreshToken: session.refreshToken } satisfies S<'RefreshTokensRequest'>,
    );
    tokenStorage.set(data);
    return true;
  } catch {
    return false;
  }
}

const AUTH_FREE = ['/auth/login', '/auth/refresh'];

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthFree = AUTH_FREE.some((p) => original?.url?.endsWith(p));
    if (error.response?.status === 401 && original && !original._retried && !isAuthFree) {
      original._retried = true;
      refreshing ??= refreshTokens().finally(() => {
        refreshing = null;
      });
      const ok = await refreshing;
      if (ok) {
        original.headers.Authorization = `Bearer ${tokenStorage.get()?.accessToken}`;
        return http(original);
      }
      tokenStorage.clear();
      expiredListeners.forEach((l) => l());
    }
    return Promise.reject(error);
  },
);

/** Typed helpers returning response data. */
export const api = {
  get: <T>(url: string, params?: object, config?: AxiosRequestConfig) =>
    http.get<T>(url, { ...config, params }).then((r) => r.data),
  post: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, body ?? {}, config).then((r) => r.data),
  put: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, body ?? {}, config).then((r) => r.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => http.delete<T>(url, config).then((r) => r.data),
  /** multipart/form-data POST */
  postForm: <T = void>(url: string, values: Record<string, unknown>) =>
    http.post<T>(url, toFormData(values)).then((r) => r.data),
  /** Binary GET/POST returning a Blob + suggested file name. */
  blob: async (method: 'get' | 'post', url: string, body?: unknown, params?: object) => {
    const r = await http.request<Blob>({ method, url, data: body, params, responseType: 'blob' });
    return { blob: r.data, fileName: fileNameFrom(r.headers['content-disposition'] as string | undefined) };
  },
};

export function toFormData(values: Record<string, unknown>): FormData {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (v instanceof Blob) fd.append(k, v);
    else fd.append(k, String(v));
  });
  return fd;
}

function fileNameFrom(header?: string): string | undefined {
  if (!header) return undefined;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1];
}
