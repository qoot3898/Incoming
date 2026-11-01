import { Paper } from '@mui/material';
import { DataGrid, type GridColDef, type GridRowIdGetter, type GridValidRowModel } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import type { Paged } from '@/types/api';
import { ErrorState } from '@/components/common/States';
import { useEmptyOverlay, useGridLocaleText } from './gridHooks';

const PAGE_SIZES_SERVER = [10, 25, 50, 100];
const PAGE_SIZES_LOCAL = [25, 50, 100];
const LOCAL_INITIAL_STATE = { pagination: { paginationModel: { pageSize: 25 } } };
const clickableRow = () => 'clickable';


interface Props<T extends GridValidRowModel> {
  columns: GridColDef<T>[];
  data?: Paged<T>;
  loading: boolean;
  error?: unknown;
  getRowId: GridRowIdGetter<T>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: (string | number)[]) => void;
}

/** DataGrid in server pagination mode bound to a backend `PagedResult<T>` (1-based pages). */
export function ServerDataGrid<T extends GridValidRowModel>({
  columns,
  data,
  loading,
  error,
  getRowId,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  emptyText,
  checkboxSelection,
  onSelectionChange,
}: Props<T>) {
  const { t } = useTranslation();
  const localeText = useGridLocaleText();
  const slots = useEmptyOverlay(emptyText ?? t('common.empty'));
  if (error) return <ErrorState error={error} />;
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <DataGrid<T>
        autoHeight
        localeText={localeText}
        rows={data?.items ?? []}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        rowCount={data?.total ?? 0}
        paginationMode="server"
        pageSizeOptions={PAGE_SIZES_SERVER}
        paginationModel={{ page: page - 1, pageSize }}
        onPaginationModelChange={(m) => {
          if (m.pageSize !== pageSize) onPageSizeChange(m.pageSize);
          else onPageChange(m.page + 1);
        }}
        checkboxSelection={checkboxSelection}
        onRowSelectionModelChange={(ids) => onSelectionChange?.(ids as (string | number)[])}
        onRowClick={onRowClick ? (p) => onRowClick(p.row) : undefined}
        getRowClassName={onRowClick ? clickableRow : undefined}
        sortingMode="server"
        disableColumnSorting
        slots={slots}
        sx={{ minHeight: 280, '& .MuiDataGrid-overlayWrapper': { minHeight: 200 } }}
      />
    </Paper>
  );
}

interface LocalProps<T extends GridValidRowModel> {
  columns: GridColDef<T>[];
  rows: T[];
  getRowId: GridRowIdGetter<T>;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  checkboxSelection?: boolean;
  onSelectionChange?: (ids: (string | number)[]) => void;
  selection?: (string | number)[];
  isRowSelectable?: (row: T) => boolean;
}

/** DataGrid for endpoints that return full arrays (client pagination). */
export function LocalDataGrid<T extends GridValidRowModel>({ columns, rows, getRowId, loading, onRowClick, emptyText, checkboxSelection, onSelectionChange, selection, isRowSelectable }: LocalProps<T>) {
  const { t } = useTranslation();
  const localeText = useGridLocaleText();
  const slots = useEmptyOverlay(emptyText ?? t('common.empty'));
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <DataGrid<T>
        autoHeight
        localeText={localeText}
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        loading={loading}
        pageSizeOptions={PAGE_SIZES_LOCAL}
        initialState={LOCAL_INITIAL_STATE}
        checkboxSelection={checkboxSelection}
        rowSelectionModel={selection}
        isRowSelectable={isRowSelectable ? (p) => isRowSelectable(p.row) : undefined}
        onRowSelectionModelChange={(ids) => onSelectionChange?.(ids as (string | number)[])}
        onRowClick={onRowClick ? (p) => onRowClick(p.row) : undefined}
        getRowClassName={onRowClick ? clickableRow : undefined}
        slots={slots}
        sx={{ minHeight: 240 }}
      />
    </Paper>
  );
}
