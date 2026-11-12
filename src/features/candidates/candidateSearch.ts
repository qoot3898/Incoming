import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { candidatesApi, candidatesKeys } from '@/features/staffing/api';
import { useDebounced } from '@/hooks/useDebounced';
import type { S } from '@/types/api';

export type PoolCandidate = S<'CandidateListItem'>;

/** `Name — Nationality · phone`, how an available candidate is shown while choosing. */
export function candidateLabel(c: Pick<PoolCandidate, 'name' | 'nationalityName' | 'phone'>): string {
  return [[c.name, c.nationalityName].filter(Boolean).join(' — '), c.phone].filter(Boolean).join(' · ');
}

/**
 * Debounced search of the candidates that can be nominated now (`PoolStatus=Available`), optionally narrowed to
 * the job they are for. It loads the first page as soon as it is used, so the picker opens with choices.
 */
export function useAvailableCandidates(jobId: number | undefined) {
  const [input, setInput] = useState('');
  const text = useDebounced(input.trim());
  const params = { PoolStatus: 'Available' as const, JobId: jobId, Search: text || undefined, Page: 1, PageSize: 20 };
  const query = useQuery({ queryKey: candidatesKeys.picker(params), queryFn: ({ signal }) => candidatesApi.list(params, signal), staleTime: 30_000 });
  return { input, setInput, items: query.data?.items ?? [], loading: query.isFetching };
}
