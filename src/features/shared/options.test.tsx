import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useScopeOptions } from './options';
import { sharedApi } from './api';
import type { S } from '@/types/api';

// The directory as the API sends it: every item carries its number, so option labels read `5 — Cook`.
const directory = {
  tracks: [],
  trackSites: [],
  workSites: [],
  jobs: [
    { id: 5, number: 5, name: 'طباخ', isActive: true },
    { id: 6, number: 6, name: 'سائق', isActive: true },
  ],
  nationalities: [],
  managements: [],
  scopeEmpty: false,
} as unknown as S<'LaborFormOptions'>;

function load() {
  vi.spyOn(sharedApi, 'formOptions').mockResolvedValue(directory);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useScopeOptions(), { wrapper });
}

describe('useScopeOptions jobs', () => {
  afterEach(() => vi.restoreAllMocks());

  it('labels a job with its number and name', async () => {
    const { result } = load();
    await waitFor(() => expect(result.current.jobs).toHaveLength(2));
    expect(result.current.jobs[0]).toEqual({ value: 5, label: '5 — طباخ' });
  });

  it('finds a job by the plain name a request carries (TL-N13: default job of a nomination)', async () => {
    const { result } = load();
    await waitFor(() => expect(result.current.jobs).toHaveLength(2));
    expect(result.current.jobIdByName('سائق')).toBe(6);
  });

  it('answers null for an unknown, empty or missing name', async () => {
    const { result } = load();
    await waitFor(() => expect(result.current.jobs).toHaveLength(2));
    expect(result.current.jobIdByName('غير موجود')).toBeNull();
    expect(result.current.jobIdByName('')).toBeNull();
    expect(result.current.jobIdByName(null)).toBeNull();
    expect(result.current.jobIdByName(undefined)).toBeNull();
  });
});
