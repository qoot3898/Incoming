import { useEffect, useMemo, useRef } from 'react';
import { Button } from '@mui/material';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import { useTranslation } from 'react-i18next';
import type { GridSlots } from '@mui/x-data-grid';
import { arSD, enUS } from '@mui/x-data-grid/locales';
import { EmptyState } from '@/components/common/States';

const AR = arSD.components.MuiDataGrid.defaultProps.localeText;
const EN = enUS.components.MuiDataGrid.defaultProps.localeText;

/**
 * DataGrid locale text for the active language.
 * Lives next to the grid (not in the global theme) so the DataGrid chunk is only
 * downloaded by pages that actually render a grid.
 */
export function useGridLocaleText() {
  const { i18n } = useTranslation();
  return i18n.dir(i18n.language) === 'rtl' ? AR : EN;
}

interface EmptyOptions {
  /** Filters are applied: show "no matching results" and a clear-filters action. */
  filtered?: boolean;
  onClearFilters?: () => void;
}

/**
 * Stable `noRowsOverlay` slot: an inline arrow would be a new component type on every
 * render and remount the overlay; this one only changes when its text changes.
 * The clear-filters handler is read from a ref so a new closure does not remount it.
 */
export function useEmptyOverlay(title: string, { filtered = false, onClearFilters }: EmptyOptions = {}): Partial<GridSlots> {
  const { t } = useTranslation();
  const clearRef = useRef(onClearFilters);
  useEffect(() => {
    clearRef.current = onClearFilters;
  });
  const canClear = filtered && !!onClearFilters;
  const noResults = t('common.noResults');
  const hint = t('filters.noResultsHint');
  const clearLabel = t('filters.clearAll');
  return useMemo(
    () => ({
      noRowsOverlay: () =>
        filtered ? (
          <EmptyState
            icon={<SearchOffOutlinedIcon />}
            title={noResults}
            description={hint}
            action={
              canClear ? (
                <Button size="small" startIcon={<FilterAltOffOutlinedIcon />} onClick={() => clearRef.current?.()} sx={{ mt: 1 }}>
                  {clearLabel}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState title={title} />
        ),
    }),
    [title, filtered, canClear, noResults, hint, clearLabel],
  );
}
