import type { ReactNode } from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import { FilterBar, type ActiveFilter } from './FilterBar';
import { SearchField } from './SearchField';
import { SelectField } from '@/components/forms/SelectField';
import type { FilterDefaults, FilterValue, ListState } from '@/hooks/useListState';
import type { FilterDef } from './filters';
import { formatDate, formatDateTime } from '@/utils/format';

interface Props<F extends FilterDefaults> {
  list: ListState<F>;
  filters: FilterDef<F>[];
  /** Extra, page-specific controls appended to the filter grid. */
  children?: ReactNode;
}

function coerce(fallback: FilterValue, raw: string): FilterValue {
  if (typeof fallback === 'number') return raw.trim() === '' ? fallback : Number(raw);
  return raw;
}

/**
 * Config-driven filter panel bound to URL list state:
 * debounced text/date/number inputs, immediate selects and switches,
 * removable "active filter" chips and a "Clear all" that keeps the page's tab.
 */
export function FilterPanel<F extends FilterDefaults>({ list, filters, children }: Props<F>) {
  const visible = filters.filter((f) => !f.hidden);
  const { filters: values, activeKeys, setFilter, setFilters, reset } = list;

  const patchFor = (def: FilterDef<F>, value: FilterValue): Partial<F> => {
    const patch: Record<string, FilterValue> = { [def.key]: value };
    if (def.kind === 'select') def.clears?.forEach((k) => (patch[k] = ''));
    return patch as Partial<F>;
  };

  const show = (def: FilterDef<F>, value: FilterValue): string => {
    switch (def.kind) {
      case 'select':
        return def.options.find((o) => String(o.value) === String(value))?.label ?? String(value);
      case 'date':
        return def.withTime ? formatDateTime(String(value)) : formatDate(String(value));
      case 'switch':
        return '';
      default:
        return String(value);
    }
  };
  // A handful of chips: cheap to derive on every render, no memo needed.
  const activeSet = new Set<string>(activeKeys);
  const active: ActiveFilter[] = visible
    .filter((def) => activeSet.has(def.key))
    .map((def) => {
      const text = show(def, values[def.key]);
      return {
        key: def.key,
        label: text ? `${def.chipLabel ?? def.label}: ${text}` : (def.chipLabel ?? def.label),
        onDelete: () => {
          const patch: Record<string, undefined> = { [def.key]: undefined };
          if (def.kind === 'select') def.clears?.forEach((k) => (patch[k] = undefined));
          setFilters(patch as Partial<F>);
        },
      };
    });

  return (
    <FilterBar active={active} onReset={() => reset(filters.map((f) => f.key))}>
      {visible.map((def) => {
        const value = values[def.key];
        const sx = def.wide ? { gridColumn: { md: 'span 2' } } : undefined;
        switch (def.kind) {
          case 'search':
            return (
              <SearchField
                key={def.key}
                label={def.label}
                type={def.inputType === 'number' ? 'number' : 'search'}
                value={String(value)}
                onCommit={(v) => setFilter(def.key, coerce(value, v) as F[typeof def.key])}
                sx={sx}
              />
            );
          case 'date':
            return (
              <SearchField
                key={def.key}
                label={def.label}
                type={def.withTime ? 'datetime-local' : 'date'}
                value={String(value)}
                onCommit={(v) => setFilter(def.key, v as F[typeof def.key])}
                sx={sx}
              />
            );
          case 'select':
            return (
              <SelectField
                key={def.key}
                label={def.label}
                value={String(value)}
                options={def.options}
                emptyLabel={def.emptyLabel}
                onChange={(v) => setFilters(patchFor(def, coerce(value, v)))}
                sx={sx}
              />
            );
          case 'switch':
            return (
              <FormControlLabel
                key={def.key}
                sx={{ ...sx, minHeight: 40, m: 0 }}
                control={<Switch checked={Boolean(value)} onChange={(e) => setFilter(def.key, e.target.checked as F[typeof def.key])} />}
                label={def.label}
              />
            );
          default:
            return null;
        }
      })}
      {children}
    </FilterBar>
  );
}
