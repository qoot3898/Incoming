import type { Option } from '@/components/forms/FormDialog';
import type { FilterDefaults, ListState } from '@/hooks/useListState';

export type FilterKey<F> = keyof F & string;

interface Base<F> {
  key: FilterKey<F>;
  label: string;
  /** Shorter label for the active-filter chip (defaults to `label`). */
  chipLabel?: string;
  /** Spans two grid columns on ≥md screens (long search boxes). */
  wide?: boolean;
  /** Not rendered and not counted (e.g. a filter that only applies to another tab). */
  hidden?: boolean;
}

export type FilterDef<F> = Base<F> &
  (
    | { kind: 'search'; inputType?: 'text' | 'number' }
    | {
        kind: 'select';
        options: Option[];
        /** Label of the "no filter" option; `false` when the select always has a value. */
        emptyLabel?: string | false;
        /** Dependent filters reset together with this one (e.g. track → work site). */
        clears?: FilterKey<F>[];
      }
    | { kind: 'date'; withTime?: boolean }
    | { kind: 'switch' }
  );

/** True when any filter managed by the panel differs from its default (tabs/views excluded). */
export function isFiltered<F extends FilterDefaults>(list: ListState<F>, filters: FilterDef<F>[]) {
  const active = new Set<string>(list.activeKeys);
  return filters.some((f) => !f.hidden && active.has(f.key));
}

/** Clears the panel's filters (keeps the selected tab/view and page size). */
export function clearFilters<F extends FilterDefaults>(list: ListState<F>, filters: FilterDef<F>[]) {
  list.reset(filters.map((f) => f.key));
}
