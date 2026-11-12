import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounced } from '@/hooks/useDebounced';
import { workersApi } from '@/features/workers/api';
import type { LaborStatus, S } from '@/types/api';

export type WorkerItem = S<'LaborWorkerListItem'>;

/** `15020 — Name`, the same label every worker picker shows. */
export function workerLabel(w: Pick<WorkerItem, 'employeeNumber' | 'name'>): string {
  return `${w.employeeNumber} — ${w.name ?? ''}`;
}

/**
 * Debounced worker search (FR-58) shared by the single and multiple pickers: the typed text, the
 * matching workers within the user's scope, and whether a request is in flight.
 */
export function useWorkerSearch(status?: LaborStatus) {
  const [input, setInput] = useState('');
  const text = useDebounced(input.trim());
  const query = useQuery({
    queryKey: ['workers', 'picker', text, status],
    queryFn: ({ signal }) => workersApi.search({ Text: text, Status: status, Page: 1, PageSize: 20 }, signal),
    enabled: text.length >= 1,
    staleTime: 60_000,
  });
  return { input, setInput, text, items: query.data?.items ?? [], loading: query.isFetching };
}
