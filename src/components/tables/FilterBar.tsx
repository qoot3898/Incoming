import { Children, useState, type ReactNode } from 'react';
import { Badge, Box, Button, Chip, Collapse, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import { useTranslation } from 'react-i18next';

export interface ActiveFilter {
  key: string;
  /** "Label: value" text shown on the chip. */
  label: string;
  onDelete: () => void;
}

const grid = {
  display: 'grid',
  gap: 1.5,
  alignItems: 'start',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(4, minmax(0,1fr))', lg: 'repeat(6, minmax(0,1fr))' },
} as const;

interface Props {
  children: ReactNode;
  onReset?: () => void;
  /**
   * Filters that differ from their defaults. When provided, they are shown as removable chips
   * with a "Clear all" action (instead of the always-visible reset button).
   */
  active?: ActiveFilter[];
}

/** Responsive filter strip above lists; on phones only the first filter is shown until expanded. */
export function FilterBar({ children, onReset, active }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const activeCount = active?.length ?? 0;

  const legacyReset = !active && onReset && (
    <Box sx={{ justifySelf: { xs: 'stretch', md: 'start' }, alignSelf: 'center' }}>
      <Button startIcon={<RestartAltIcon />} color="inherit" onClick={onReset} size="small">
        {t('common.resetFilters')}
      </Button>
    </Box>
  );

  const chips =
    activeCount > 0 ? (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        role="region"
        aria-label={t('filters.active')}
        sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {t('filters.activeCount', { count: activeCount })}
        </Typography>
        {active!.map((f) => (
          <Chip key={f.key} size="small" variant="outlined" label={f.label} onDelete={f.onDelete} sx={{ maxWidth: '100%' }} />
        ))}
        {onReset && (
          <Button size="small" color="inherit" startIcon={<RestartAltIcon />} onClick={onReset} sx={{ marginInlineStart: 'auto' }}>
            {t('filters.clearAll')}
          </Button>
        )}
      </Stack>
    ) : null;

  if (phone && items.length > 1) {
    return (
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }} component="section" aria-label={t('filters.title')}>
        <Box sx={grid}>
          {items[0]}
          <Button
            startIcon={
              <Badge color="primary" badgeContent={activeCount} invisible={open || activeCount === 0}>
                <TuneIcon />
              </Badge>
            }
            onClick={() => setOpen((o) => !o)}
            color="inherit"
            size="small"
            aria-expanded={open}
          >
            {open ? t('common.hideFilters') : t('common.moreFilters', { count: items.length - 1 })}
          </Button>
        </Box>
        <Collapse in={open}>
          <Box sx={{ ...grid, mt: 1.5 }}>
            {items.slice(1)}
            {legacyReset}
          </Box>
        </Collapse>
        {chips}
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }} component="section" aria-label={t('filters.title')}>
      <Box sx={grid}>
        {items}
        {legacyReset}
      </Box>
      {chips}
    </Paper>
  );
}
