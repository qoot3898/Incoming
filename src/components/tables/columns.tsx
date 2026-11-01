import type { GridColDef, GridValidRowModel } from '@mui/x-data-grid';
import { StatusChip } from '@/components/common/StatusChip';
import { formatDate, formatDateTime, formatMoney } from '@/utils/format';
import type { Schemas } from '@/types/api';

type Base<T extends GridValidRowModel> = Partial<GridColDef<T>>;

/** Column helpers for consistent formatting across lists. */
export const col = {
  text: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    flex: 1,
    minWidth: 140,
    valueFormatter: (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v)),
    ...extra,
  }),
  num: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 110,
    ...extra,
  }),
  date: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 120,
    valueFormatter: (v: unknown) => formatDate(v as string | null),
    ...extra,
  }),
  dateTime: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 160,
    valueFormatter: (v: unknown) => formatDateTime(v as string | null),
    ...extra,
  }),
  money: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 120,
    valueFormatter: (v: unknown) => formatMoney(v as number | null),
    ...extra,
  }),
  status: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, enumName: keyof Schemas, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 150,
    renderCell: (p) => <StatusChip enumName={enumName} value={p.value as string | null} />,
    ...extra,
  }),
  bool: <T extends GridValidRowModel>(field: keyof T & string, headerName: string, yes: string, no: string, extra: Base<T> = {}): GridColDef<T> => ({
    field,
    headerName,
    width: 100,
    valueFormatter: (v: unknown) => (v === null || v === undefined ? '—' : v ? yes : no),
    ...extra,
  }),
};
