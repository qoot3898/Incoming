import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type FilterValue = string | number | boolean;
export type FilterDefaults = Record<string, FilterValue>;

/** Page sizes offered by server-paginated grids; anything else in the URL falls back to the default. */
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;
const PAGE_KEY = 'page';
const SIZE_KEY = 'size';

export interface ListState<F extends FilterDefaults> {
  /** Current filter values (URL value, or the default when absent/invalid). */
  filters: F;
  /** 1-based page. */
  page: number;
  pageSize: number;
  /** Filter keys whose current value differs from the default. */
  activeKeys: (keyof F & string)[];
  setFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  /** Applies several filter changes as ONE history entry (e.g. track + dependent site). */
  setFilters: (patch: Partial<F>) => void;
  /** Restores one filter to its default. */
  clearFilter: (key: keyof F) => void;
  /** Restores the given filters (default: all) to their defaults and goes back to page 1. */
  reset: (keys?: readonly (keyof F)[]) => void;
  setPage: (page: number, options?: { replace?: boolean }) => void;
  setPageSize: (size: number) => void;
  /**
   * Request params: non-empty filters + `Page` (1-based) + `PageSize`.
   * Empty values are dropped so equivalent states share one query key (and one cache entry).
   */
  params: Partial<F> & { Page: number; PageSize: number };
}

function parse(raw: string | null, fallback: FilterValue): FilterValue {
  if (raw === null) return fallback;
  if (typeof fallback === 'number') {
    const n = Number(raw);
    return raw.trim() !== '' && Number.isFinite(n) ? n : fallback;
  }
  if (typeof fallback === 'boolean') return raw === 'true' ? true : raw === 'false' ? false : fallback;
  return raw;
}

export function parsePage(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function parsePageSize(raw: string | null): number {
  const n = Number(raw);
  return (PAGE_SIZES as readonly number[]).includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** Writes a patch onto URL params: defaults and empty values are removed to keep URLs short and canonical. */
export function applyPatch(
  current: URLSearchParams,
  patch: Record<string, FilterValue | undefined | null>,
  defaults: FilterDefaults,
): URLSearchParams {
  const next = new URLSearchParams(current);
  Object.entries(patch).forEach(([key, value]) => {
    const fallback = defaults[key];
    if (value === undefined || value === null || value === '' || (fallback !== undefined && String(value) === String(fallback))) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  });
  return next;
}

/**
 * Page-level list state (filters, search, pagination) owned by the URL:
 * - survives refresh and can be shared as a link;
 * - every user change is a history entry, so Back/Forward restore earlier filter states;
 * - changing a filter returns to page 1;
 * - unrelated params (e.g. `tab`, `employeeNumber`) are left untouched.
 *
 * Text inputs must commit through `SearchField` (debounced) so typing does not
 * create a request or a history entry per keystroke.
 */
export function useListState<F extends FilterDefaults>(defaults: F): ListState<F> {
  const [sp, setSp] = useSearchParams();
  // Callers pass an inline object; the defaults are fixed for the lifetime of the list.
  const [initial] = useState(defaults);
  const keys = useMemo(() => Object.keys(initial) as (keyof F & string)[], [initial]);

  const filters = useMemo(() => {
    const out = { ...initial };
    keys.forEach((k) => {
      out[k] = parse(sp.get(k), initial[k]) as F[typeof k];
    });
    return out;
  }, [sp, initial, keys]);

  const page = parsePage(sp.get(PAGE_KEY));
  const pageSize = parsePageSize(sp.get(SIZE_KEY));

  const activeKeys = useMemo(() => keys.filter((k) => String(filters[k]) !== String(initial[k])), [keys, filters, initial]);

  const write = useCallback(
    (patch: Record<string, FilterValue | undefined | null>, opts: { resetPage: boolean; replace?: boolean }) => {
      const full = opts.resetPage ? { ...patch, [PAGE_KEY]: undefined } : patch;
      // Skip no-op navigations so re-selecting the same value does not add a history entry.
      if (applyPatch(sp, full, initial).toString() === sp.toString()) return;
      setSp((prev) => applyPatch(prev, full, initial), { replace: opts.replace ?? false });
    },
    [sp, setSp, initial],
  );

  const setFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => write({ [key as string]: value }, { resetPage: true }), [write]);
  const setFilters = useCallback((patch: Partial<F>) => write(patch as Record<string, FilterValue>, { resetPage: true }), [write]);
  const clearFilter = useCallback((key: keyof F) => write({ [key as string]: undefined }, { resetPage: true }), [write]);
  const reset = useCallback(
    (only?: readonly (keyof F)[]) => {
      const patch: Record<string, undefined> = {};
      (only ?? keys).forEach((k) => {
        patch[k as string] = undefined;
      });
      write(patch, { resetPage: true });
    },
    [keys, write],
  );
  const setPage = useCallback(
    (p: number, options?: { replace?: boolean }) => write({ [PAGE_KEY]: p > 1 ? p : undefined }, { resetPage: false, replace: options?.replace }),
    [write],
  );
  const setPageSize = useCallback(
    (s: number) => write({ [SIZE_KEY]: s === DEFAULT_PAGE_SIZE ? undefined : s }, { resetPage: true }),
    [write],
  );

  const params = useMemo(() => {
    const out: Record<string, FilterValue> = {};
    keys.forEach((k) => {
      const v = filters[k];
      if (v !== '') out[k] = v;
    });
    return { ...out, Page: page, PageSize: pageSize } as Partial<F> & { Page: number; PageSize: number };
  }, [keys, filters, page, pageSize]);

  return { filters, page, pageSize, activeKeys, setFilter, setFilters, clearFilter, reset, setPage, setPageSize, params };
}
