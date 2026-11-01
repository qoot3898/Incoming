import type { ReactNode } from 'react';
import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions, meta }: Props) {
  const { t } = useTranslation();
  const crumbs: Crumb[] = [{ label: t('nav.home'), to: '/' }, ...(breadcrumbs ?? [])];
  return (
    <Box component="header" sx={{ mb: 3 }}>
      <Breadcrumbs sx={{ mb: 1, fontSize: '0.8rem' }} aria-label={t('common.breadcrumbs')}>
        {crumbs.map((c, i) =>
          c.to && i < crumbs.length - 1 ? (
            <Link key={`${c.label}|${c.to}`} component={RouterLink} to={c.to} underline="hover" color="text.secondary">
              {c.label}
            </Link>
          ) : (
            <Typography key={`${c.label}|${c.to ?? ''}`} color="text.primary" fontSize="inherit">
              {c.label}
            </Typography>
          ),
        )}
        <Typography color="text.primary" fontSize="inherit" fontWeight={600}>
          {title}
        </Typography>
      </Breadcrumbs>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} justifyContent="space-between">
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            {meta}
          </Stack>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
