import { useMemo } from 'react';
import { useFormOptions } from './api';
import type { Option } from '@/components/forms/FormDialog';

interface Named {
  id: number;
  name: string | null;
  number?: number;
  isActive?: boolean;
}

const toOptions = (items: Named[] = []): Option[] =>
  items.map((i) => ({ value: i.id, label: i.number !== undefined ? `${i.number} — ${i.name ?? ''}` : i.name ?? String(i.id) }));

/** Select options from `/forms/options` (scoped to the user); sites can be narrowed to a track. */
export function useScopeOptions(trackId?: number | string | null) {
  const q = useFormOptions();
  return useMemo(() => {
    const d = q.data;
    const tId = trackId === '' || trackId === null || trackId === undefined ? undefined : Number(trackId);
    const siteMap = new Map<number, Named>();
    (d?.trackSites ?? []).filter((s) => tId === undefined || s.trackId === tId).forEach((s) => siteMap.set(s.id, s));
    return {
      loading: q.isLoading,
      tracks: toOptions(d?.tracks),
      sites: toOptions([...siteMap.values()]),
      allWorkSites: toOptions(d?.workSites),
      jobs: toOptions(d?.jobs),
      nationalities: toOptions(d?.nationalities),
      managements: toOptions(d?.managements),
      scopeEmpty: d?.scopeEmpty ?? false,
    };
  }, [q.data, q.isLoading, trackId]);
}
