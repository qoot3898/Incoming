import axios, { AxiosError, type AxiosProgressEvent, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { S } from '@/types/api';
import { tokenStorage } from './tokenStorage';
import { API_ERROR_CODES, blobText, problemCode } from './errors';

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

/**
 * Account-level gates the API reports on any request (403 + stable code): the temporary password
 * must be changed, or the assignment letter (TL-N3) is not approved yet. The auth provider listens
 * and re-reads `auth/me`, and the route guard then shows the matching screen.
 */
export type AccessGateCode = typeof API_ERROR_CODES.passwordChangeRequired | typeof API_ERROR_CODES.assignmentApprovalRequired;
type AccessGateListener = (code: AccessGateCode) => void;
const gateListeners = new Set<AccessGateListener>();
export function onAccessGate(listener: AccessGateListener) {
  gateListeners.add(listener);
  return () => gateListeners.delete(listener);
}

const GATE_CODES: ReadonlySet<string> = new Set([API_ERROR_CODES.passwordChangeRequired, API_ERROR_CODES.assignmentApprovalRequired]);

/**
 * A plain 403 `FORBIDDEN` (not an account gate) means the user lacks the permission *now*. Direct grants
 * and denials (TL-N9) apply on the user's next request without a new sign-in, so the permissions the
 * screens were built from may be stale: the auth provider re-reads `auth/me` to refresh menus and buttons.
 */
const deniedListeners = new Set<() => void>();
export function onPermissionDenied(listener: () => void) {
  deniedListeners.add(listener);
  return () => deniedListeners.delete(listener);
}

/** The error code of a 403 body; blob responses (file downloads) carry the ProblemDetails as a Blob. */
async function forbiddenCode(data: unknown): Promise<string | undefined> {
  if (data instanceof Blob) {
    if (!data.type.includes('json')) return undefined;
    try {
      return problemCode(JSON.parse(await blobText(data)));
    } catch {
      return undefined;
    }
  }
  return problemCode(data);
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
    if (error.response?.status === 403 && (gateListeners.size > 0 || deniedListeners.size > 0)) {
      const code = await forbiddenCode(error.response.data);
      if (code && GATE_CODES.has(code)) gateListeners.forEach((l) => l(code as AccessGateCode));
      else if (code === API_ERROR_CODES.forbidden) deniedListeners.forEach((l) => l());
    }
    return Promise.reject(error);
  },
);

/**
 * Client for the anonymous surface (`/public/*`, e.g. the complaint form, TL-N1): no
 * `Authorization` header, no token refresh — only the language header.
 */
export const publicHttp = axios.create({ baseURL: API_PREFIX, headers: { Accept: 'application/json' } });
publicHttp.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = currentLanguage;
  return config;
});

/** Cancellation and progress reporting for uploads (multipart requests). */
export interface TransferOptions {
  signal?: AbortSignal;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
}

/** Mutation variables for an upload: form values + transfer options (kept out of the FormData). */
export interface UploadVars<T = Record<string, unknown>> {
  values: T;
  transfer?: TransferOptions;
}

/** Typed helpers returning response data. */
export const api = {
  get: <T>(url: string, params?: object, config?: AxiosRequestConfig) =>
    http.get<T>(url, { ...config, params }).then((r) => r.data),
  post: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.post<T>(url, body ?? {}, config).then((r) => r.data),
  put: <T = void>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    http.put<T>(url, body ?? {}, config).then((r) => r.data),
  delete: <T = void>(url: string, config?: AxiosRequestConfig) => http.delete<T>(url, config).then((r) => r.data),
  /**
   * multipart/form-data POST. The browser sets the boundary header for FormData; `transfer`
   * adds upload progress and cancellation (AbortSignal).
   */
  postForm: <T = void>(url: string, values: Record<string, unknown>, transfer?: TransferOptions) =>
    http.post<T>(url, toFormData(values), { signal: transfer?.signal, onUploadProgress: transfer?.onUploadProgress }).then((r) => r.data),
  /** multipart/form-data PUT, same conventions as `postForm` (empty values are not sent). */
  putForm: <T = void>(url: string, values: Record<string, unknown>, transfer?: TransferOptions) =>
    http.put<T>(url, toFormData(values), { signal: transfer?.signal, onUploadProgress: transfer?.onUploadProgress }).then((r) => r.data),
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
