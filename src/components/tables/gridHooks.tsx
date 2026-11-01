import { useMemo } from 'react';
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

/**
 * Stable `noRowsOverlay` slot: an inline arrow would be a new component type on every
 * render and remount the overlay; this one only changes when the text changes.
 */
export function useEmptyOverlay(title: string): Partial<GridSlots> {
  return useMemo(() => ({ noRowsOverlay: () => <EmptyState title={title} /> }), [title]);
}
