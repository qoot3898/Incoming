import { Children, useState, type ReactNode } from 'react';
import { Box, Button, Collapse, Paper, useMediaQuery, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';

const grid = {
  display: 'grid',
  gap: 1.5,
  alignItems: 'center',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))', lg: 'repeat(6, minmax(0,1fr))' },
} as const;

/** Responsive filter strip above lists; on phones only the first filter is shown until expanded. */
export function FilterBar({ children, onReset }: { children: ReactNode; onReset?: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const reset = onReset && (
    <Box sx={{ justifySelf: { xs: 'stretch', md: 'start' } }}>
      <Button startIcon={<RestartAltIcon />} color="inherit" onClick={onReset} size="small">
        {t('common.resetFilters')}
      </Button>
    </Box>
  );

  if (phone && items.length > 1) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Box sx={grid}>
          {items[0]}
          <Button startIcon={<TuneIcon />} onClick={() => setOpen((o) => !o)} color="inherit" size="small" aria-expanded={open}>
            {open ? t('common.hideFilters') : t('common.moreFilters', { count: items.length - 1 })}
          </Button>
        </Box>
        <Collapse in={open}>
          <Box sx={{ ...grid, mt: 1.5 }}>
            {items.slice(1)}
            {reset}
          </Box>
        </Collapse>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
      <Box sx={grid}>
        {items}
        {reset}
      </Box>
    </Paper>
  );
}
