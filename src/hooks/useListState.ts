import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ListState<F> {
  filters: F;
  page: number;
  pageSize: number;
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  setFilters: (f: F) => void;
  reset: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  /** Request params: filters + Page (1-based) + PageSize */
  params: F & { Page: number; PageSize: number };
}

/** List filter + pagination state kept in the URL so lists survive navigation and can be shared. */
export function useListState<F extends Record<string, string | number | boolean | undefined>>(defaults: F): ListState<F> {
  const [sp, setSp] = useSearchParams();
  // Callers pass an inline object; the defaults are fixed for the lifetime of the list.
  const [initial] = useState(defaults);

  const filters = useMemo(() => {
    const out = { ...initial };
    (Object.keys(initial) as (keyof F)[]).forEach((k) => {
      const raw = sp.get(String(k));
      if (raw === null) return;
      const d = initial[k];
      out[k] = (typeof d === 'number' ? Number(raw) : typeof d === 'boolean' ? raw === 'true' : raw) as F[keyof F];
    });
    return out;
  }, [sp, initial]);

  const page = Number(sp.get('page') ?? 1) || 1;
  const pageSize = Number(sp.get('size') ?? 25) || 25;

  const write = useCallback(
    (patch: Record<string, string | number | boolean | undefined>, resetPage = true) => {
      setSp(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => {
            if (v === undefined || v === '' || v === null) next.delete(k);
            else next.set(k, String(v));
          });
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSp],
  );

  return {
    filters,
    page,
    pageSize,
    setFilter: (key, value) => write({ [String(key)]: value as string | number | boolean | undefined }),
    setFilters: (f) => write(f),
    reset: () => setSp(new URLSearchParams(), { replace: true }),
    setPage: (p) => write({ page: p > 1 ? p : undefined }, false),
    setPageSize: (s) => write({ size: s }),
    params: { ...filters, Page: page, PageSize: pageSize },
  };
}
