import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { http, onAccessGate, onPermissionDenied, toFormData } from './client';

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

  it('reports an ordinary FORBIDDEN as a permission refusal, so stale permissions can be refreshed (TL-N9)', async () => {
    const denied = vi.fn();
    const gate = vi.fn();
    const offDenied = onPermissionDenied(denied);
    const offGate = onAccessGate(gate);
    off.push(() => void offDenied(), () => void offGate());
    await reject(forbidden({ code: 'FORBIDDEN' }));
    await reject(forbidden(new Blob([JSON.stringify({ code: 'FORBIDDEN' })], { type: 'application/problem+json' })));
    expect(denied).toHaveBeenCalledTimes(2);
    expect(gate).not.toHaveBeenCalled();
    await reject(forbidden({ code: 'ASSIGNMENT_APPROVAL_REQUIRED' }));
    expect(denied).toHaveBeenCalledTimes(2);
  });
});

describe('toFormData', () => {
  it('leaves out empty values, so an empty capacity means "no limit" (TL-N7)', () => {
    const file = new File(['%PDF-'], 'decision.pdf', { type: 'application/pdf' });
    const fd = toFormData({ capacity: null, rowVersion: 'AAAAAAAAB9E=', file, note: '' });
    expect(fd.has('capacity')).toBe(false);
    expect(fd.has('note')).toBe(false);
    expect(fd.get('rowVersion')).toBe('AAAAAAAAB9E=');
    expect((fd.get('file') as File).name).toBe('decision.pdf');
  });

  it('keeps a capacity of zero', () => {
    expect(toFormData({ capacity: 0 }).get('capacity')).toBe('0');
  });
});
