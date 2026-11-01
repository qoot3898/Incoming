import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { workersApi } from '@/features/workers/api';
import type { S } from '@/types/api';

type Item = S<'LaborWorkerListItem'>;

export function summaryToItem(s: S<'LaborWorkerSummary'>): Item {
  return {
    employeeId: s.employeeId,
    employeeNumber: s.employeeNumber,
    name: s.name,
    nationalityName: null,
    passportNumber: null,
    trackName: s.trackName,
    managementName: null,
    workSiteName: s.workSiteName,
    jobName: s.jobName,
    startDate: null,
    status: s.status,
    serviceEnded: s.serviceEnded,
    onLeave: false,
  };
}

/**
 * Worker selection that can be pre-filled from `?employeeNumber=` (links from the worker profile).
 * The lookup goes through the query cache (deduped, cancel-safe); once the user picks or clears
 * a worker, their choice wins over the prefill.
 */
export function usePrefilledWorker() {
  const [sp] = useSearchParams();
  const number = Number(sp.get('employeeNumber'));
  const prefill = useQuery({
    queryKey: ['workers', 'by-number', number],
    queryFn: () => workersApi.byNumber(number),
    enabled: number > 0,
    select: summaryToItem,
    retry: false,
  });
  const [picked, setPicked] = useState<Item | null | undefined>(undefined);
  const worker = picked !== undefined ? picked : (prefill.data ?? null);
  return [worker, setPicked as (worker: Item | null) => void] as const;
}
