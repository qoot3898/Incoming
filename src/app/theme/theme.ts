import { alpha, createTheme, type Direction } from '@mui/material/styles';
import { arEG, enUS } from '@mui/material/locale';
import type {} from '@mui/x-data-grid/themeAugmentation';
import { brand } from './brand';

export { brand, onTeal } from './brand';

export function createAppTheme(direction: Direction) {
  const ar = direction === 'rtl';
  return createTheme(
    {
      direction,
      palette: {
        mode: 'light',
        primary: { main: brand.teal, dark: brand.tealDark, light: brand.tealLight, contrastText: '#FFFFFF' },
        secondary: { main: brand.leaf, dark: brand.leafDark, light: brand.leafSoft, contrastText: brand.teal },
        success: { main: '#2E7D4F' },
        warning: { main: '#B26A00' },
        error: { main: '#B3261E' },
        info: { main: '#1F5F8B' },
        text: { primary: brand.ink, secondary: brand.muted },
        divider: brand.line,
        background: { default: brand.canvas, paper: '#FFFFFF' },
      },
      shape: { borderRadius: 10 },
      spacing: 8,
      typography: {
        fontFamily: ['"IBM Plex Sans Arabic"', '"Segoe UI"', 'Tahoma', 'system-ui', 'sans-serif'].join(','),
        fontSize: 14,
        h4: { fontSize: '1.6rem', fontWeight: 700, letterSpacing: 0 },
        h5: { fontSize: '1.3rem', fontWeight: 700 },
        h6: { fontSize: '1.05rem', fontWeight: 600 },
        subtitle1: { fontWeight: 600 },
        subtitle2: { fontWeight: 600, fontSize: '0.85rem' },
        body2: { fontSize: '0.875rem' },
        caption: { fontSize: '0.75rem' },
        button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
        overline: { fontWeight: 600, letterSpacing: ar ? 0 : '0.06em', fontSize: '0.7rem' },
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: { backgroundColor: brand.canvas },
            '::selection': { backgroundColor: alpha(brand.leaf, 0.45) },
            ':focus-visible': { outlineColor: brand.teal },
          },
        },
        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: { borderRadius: 8, paddingInline: 16 },
            sizeSmall: { paddingInline: 10 },
            outlined: { borderColor: brand.line },
          },
        },
        MuiIconButton: { styleOverrides: { root: { borderRadius: 8 } } },
        MuiPaper: {
          defaultProps: { elevation: 0 },
          styleOverrides: { outlined: { borderColor: brand.line }, rounded: { borderRadius: 12 } },
        },
        MuiCard: {
          defaultProps: { variant: 'outlined' },
          styleOverrides: { root: { borderRadius: 12, borderColor: brand.line } },
        },
        MuiCardHeader: {
          styleOverrides: {
            root: { paddingBottom: 8 },
            title: { fontSize: '1rem', fontWeight: 600 },
            subheader: { fontSize: '0.8rem' },
          },
        },
        MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
        MuiFormControl: { defaultProps: { size: 'small' } },
        MuiOutlinedInput: {
          styleOverrides: {
            root: { backgroundColor: '#FFFFFF', '& .MuiOutlinedInput-notchedOutline': { borderColor: brand.inputLine } },
          },
        },
        MuiInputLabel: { styleOverrides: { root: { fontSize: '0.875rem' } } },
        MuiChip: {
          styleOverrides: {
            root: { fontWeight: 600, borderRadius: 6 },
            sizeSmall: { height: 22, fontSize: '0.72rem' },
          },
        },
        MuiDialog: {
          defaultProps: { fullWidth: true, maxWidth: 'sm' },
          styleOverrides: { paper: { borderRadius: 14 } },
        },
        MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.05rem', fontWeight: 700, paddingBottom: 8 } } },
        MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 20px' } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontSize: '0.75rem', backgroundColor: brand.ink } } },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
        MuiTabs: { styleOverrides: { root: { minHeight: 44 } } },
        MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: 600, color: brand.muted, backgroundColor: brand.surfaceHead } } },
        MuiListItemButton: {
          styleOverrides: {
            // Light-surface selection; the dark sidebar overrides this locally.
            root: {
              borderRadius: 8,
              '&.Mui-selected': { backgroundColor: alpha(brand.leaf, 0.2), color: brand.teal },
              '&.Mui-selected:hover': { backgroundColor: alpha(brand.leaf, 0.28) },
            },
          },
        },
        MuiLinearProgress: { styleOverrides: { root: { backgroundColor: alpha(brand.leaf, 0.25) } } },
        MuiDataGrid: {
          defaultProps: { density: 'compact', disableColumnMenu: true, disableRowSelectionOnClick: true },
          styleOverrides: {
            root: {
              border: 0,
              backgroundColor: '#FFFFFF',
              '--DataGrid-rowBorderColor': brand.line,
              '--DataGrid-containerBackground': brand.surfaceHead,
              '& .MuiDataGrid-columnHeaders': { backgroundColor: brand.surfaceHead },
              '& .MuiDataGrid-row:hover': { backgroundColor: alpha(brand.cream, 0.45) },
              '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 600, color: brand.muted },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' },
              '& .MuiDataGrid-cell:focus-within': { outline: 'none' },
              '& .MuiDataGrid-row.clickable': { cursor: 'pointer' },
            },
          },
        },
      },
    },
    // DataGrid locale text is applied by the grid wrappers (components/tables/gridLocale.ts)
    // so the 350 kB DataGrid chunk is not pulled into the initial bundle.
    ar ? arEG : enUS,
  );
}
