import type { ReactNode } from 'react';
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { API_ERROR_CODES, toApiErrorSync } from '@/services/api/errors';
import { brand } from '@/app/theme/brand';

export function LoadingState({ label, minHeight = 240 }: { label?: string; minHeight?: number }) {
  const { t } = useTranslation();
  return (
    <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ minHeight, color: 'text.secondary' }} role="status">
      <CircularProgress size={28} />
      <Typography variant="body2">{label ?? t('common.loading')}</Typography>
    </Stack>
  );
}

export function EmptyState({ title, description, action, icon }: { title?: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <Stack alignItems="center" justifyContent="center" spacing={1} sx={{ py: 6, px: 2, textAlign: 'center', color: 'text.secondary' }}>
      <Box sx={{ color: brand.iconMuted, '& svg': { fontSize: 44 } }}>{icon ?? <InboxOutlinedIcon />}</Box>
      <Typography variant="subtitle1" color="text.primary">
        {title ?? t('common.empty')}
      </Typography>
      {description && <Typography variant="body2">{description}</Typography>}
      {action}
    </Stack>
  );
}

/** "No access" panel: a 403 from the API, or a route the user's permissions do not cover. */
export function ForbiddenState() {
  const { t } = useTranslation();
  return (
    <Paper variant="outlined" sx={{ p: 4 }}>
      <EmptyState icon={<LockOutlinedIcon />} title={t('errors.forbiddenTitle')} description={t('errors.forbidden')} />
    </Paper>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const e = toApiErrorSync(error, t('errors.generic'));
  if (e.status === 403 && e.code === API_ERROR_CODES.assignmentApprovalRequired) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <EmptyState
          icon={<LockOutlinedIcon />}
          title={t('assignment.title')}
          description={t('errors.assignmentRequired')}
          action={
            <Button component={RouterLink} to="/assignment" variant="contained" sx={{ mt: 1 }}>
              {t('assignment.open')}
            </Button>
          }
        />
      </Paper>
    );
  }
  if (e.status === 403) return <ForbiddenState />;
  if (e.status === 404) {
    return (
      <Paper variant="outlined" sx={{ p: 4 }}>
        <EmptyState icon={<ErrorOutlineIcon />} title={t('errors.notFoundTitle')} description={e.detail ?? t('errors.notFound')} />
      </Paper>
    );
  }
  return (
    <Alert
      severity="error"
      action={
        onRetry && (
          <Button color="inherit" size="small" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )
      }
    >
      {e.detail || e.title}
    </Alert>
  );
}

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  error: unknown;
  refetch: () => unknown;
}

/** Renders loading / error / content for a TanStack query. */
export function QueryBoundary<T>({ query, children }: { query: QueryLike<T>; children: (data: T) => ReactNode }) {
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data === undefined) return <LoadingState />;
  return <>{children(query.data)}</>;
}
