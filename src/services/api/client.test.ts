import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { http, onAccessGate } from './client';

function forbidden(data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders(), url: '/workers' } as InternalAxiosRequestConfig;
  return new AxiosError('forbidden', 'ERR', config, null, { status: 403, statusText: '', headers: {}, config, data });
}

// The response interceptor's error handler (the one the client registers).
const handlers = (http.interceptors.response as unknown as { handlers: { rejected: (e: unknown) => Promise<unknown> }[] }).handlers;
const reject = (e: unknown) => handlers[0].rejected(e).catch(() => undefined);

describe('account gates on any request', () => {
  const off: (() => void)[] = [];
  afterEach(() => off.splice(0).forEach((f) => f()));

  it('reports ASSIGNMENT_APPROVAL_REQUIRED and PASSWORD_CHANGE_REQUIRED, including blob bodies', async () => {
    const seen = vi.fn();
    const unsubscribe = onAccessGate(seen);
    off.push(() => void unsubscribe());
    await reject(forbidden({ code: 'ASSIGNMENT_APPROVAL_REQUIRED' }));
    await reject(forbidden(new Blob([JSON.stringify({ code: 'PASSWORD_CHANGE_REQUIRED' })], { type: 'application/problem+json' })));
    expect(seen).toHaveBeenCalledWith('ASSIGNMENT_APPROVAL_REQUIRED');
    expect(seen).toHaveBeenCalledWith('PASSWORD_CHANGE_REQUIRED');
  });

  it('ignores an ordinary 403', async () => {
    const seen = vi.fn();
    const unsubscribe = onAccessGate(seen);
    off.push(() => void unsubscribe());
    await reject(forbidden({ code: 'FORBIDDEN' }));
    expect(seen).not.toHaveBeenCalled();
  });
});
