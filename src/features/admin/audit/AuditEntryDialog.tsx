import { useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, auditApi } from '../api';
import { auditValueText, parseAuditChanges, type AuditEntityChange } from './auditChanges';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/States';
import { brand } from '@/app/theme/brand';
import { formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type Row = S<'AuditLogItem'>;

interface Props {
  row: Row;
  onClose: () => void;
  /** Replaces the list filters (e.g. "everything this request recorded"). */
  onFilter: (patch: Record<string, string | boolean>) => void;
}

const OPERATION_TONE: Record<string, 'success' | 'info' | 'error'> = { Created: 'success', Updated: 'info', Deleted: 'error' };

/** One audit entry: who, what, from where, and the old → new values of every changed entity. */
export function AuditEntryDialog({ row, onClose, onFilter }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const inline = parseAuditChanges(row.changes);
  // Rows listed without `includeChanges` carry no values: read them from the entry itself.
  const detail = useQuery({ queryKey: [...adminKeys.audit, 'detail', row.id], queryFn: () => auditApi.get(row.id), enabled: inline.length === 0 });
  const changes = inline.length ? inline : parseAuditChanges(detail.data);
  const [raw, setRaw] = useState(false);

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={phone}>
      <DialogTitle>{t('audit.entryDetails', { id: row.id })}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 0.5 }}>
          <InfoGrid
            columns={3}
            items={[
              { label: t('audit.occurredAt'), value: formatDateTime(row.occurredAt) },
              { label: t('audit.actor'), value: [row.actorName, row.actorUserName && `(${row.actorUserName})`].filter(Boolean).join(' ') },
              { label: t('audit.outcome'), value: <StatusChip enumName="AuditOutcome" value={row.outcome} /> },
              { label: t('audit.action'), value: row.actionName },
              { label: t('audit.actionCode'), value: row.actionCode ? <bdi dir="ltr">{row.actionCode}</bdi> : null },
              { label: t('audit.entity'), value: [row.entityType, row.entityId].filter(Boolean).join(' #') },
              { label: t('audit.summary'), value: row.summary, span: 3 },
              { label: t('audit.ip'), value: row.ipAddress ? <bdi dir="ltr">{row.ipAddress}</bdi> : null },
              { label: t('audit.correlationId'), value: row.correlationId ? <bdi dir="ltr">{row.correlationId}</bdi> : null, span: 2 },
              { label: t('audit.userAgent'), value: row.userAgent ? <Box component="span" dir="ltr" sx={{ fontSize: '0.75rem', fontWeight: 400 }}>{row.userAgent}</Box> : null, span: 3 },
            ]}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {row.actorUserId != null && (
              <Button size="small" variant="outlined" startIcon={<PersonSearchOutlinedIcon />} onClick={() => onFilter({ ActorUserId: String(row.actorUserId) })}>
                {t('audit.userActivity')}
              </Button>
            )}
            {row.entityType && row.entityId && (
              <Button size="small" variant="outlined" startIcon={<HistoryOutlinedIcon />} onClick={() => onFilter({ EntityType: row.entityType!, EntityId: row.entityId!, IncludeChanges: true })}>
                {t('audit.recordHistory')}
              </Button>
            )}
            {row.correlationId && (
              <Button size="small" variant="outlined" startIcon={<LinkOutlinedIcon />} onClick={() => onFilter({ CorrelationId: row.correlationId! })}>
                {t('audit.sameRequest')}
              </Button>
            )}
          </Stack>
          <Box>
            <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>
              {t('audit.changes')}
            </Typography>
            {inline.length === 0 && detail.isLoading ? (
              <LoadingState minHeight={100} />
            ) : inline.length === 0 && detail.error ? (
              <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
            ) : changes.length === 0 ? (
              <Paper variant="outlined">
                <EmptyState title={t('audit.noChanges')} />
              </Paper>
            ) : (
              <Stack spacing={2}>
                {changes.map((c) => (
                  <ChangeTable key={`${c.entity}|${c.id}|${c.operation}`} change={c} />
                ))}
              </Stack>
            )}
          </Box>
          {detail.data !== undefined && (
            <Box>
              <Button size="small" color="inherit" onClick={() => setRaw((v) => !v)} aria-expanded={raw}>
                {raw ? t('audit.hideRaw') : t('audit.showRaw')}
              </Button>
              <Collapse in={raw} unmountOnExit>
                <Box component="pre" sx={{ m: 0, mt: 1, p: 2, bgcolor: brand.creamSoft, borderRadius: 2, fontSize: 12, overflow: 'auto', direction: 'ltr', textAlign: 'left', maxHeight: '40vh' }}>
                  {JSON.stringify(detail.data, null, 2)}
                </Box>
              </Collapse>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ChangeTable({ change: c }: { change: AuditEntityChange }) {
  const { t } = useTranslation();
  const showOld = c.operation !== 'Created';
  const showNew = c.operation !== 'Deleted';
  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1, bgcolor: brand.surfaceHead, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" dir="ltr">
          {c.entity}
          {c.id ? ` #${c.id}` : ''}
        </Typography>
        <ToneChip tone={OPERATION_TONE[c.operation] ?? 'neutral'} label={t(`audit.operation.${c.operation}`, { defaultValue: c.operation })} />
      </Stack>
      {c.fields.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          {t('audit.noFieldValues')}
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('audit.field')}</TableCell>
                {showOld && <TableCell>{t('audit.oldValue')}</TableCell>}
                {showNew && <TableCell>{t('audit.newValue')}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {c.fields.map((f) => (
                <TableRow key={f.field}>
                  <TableCell sx={{ fontWeight: 500 }}>
                    <bdi dir="ltr">{f.field}</bdi>
                  </TableCell>
                  {showOld && (
                    <TableCell dir="auto" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
                      {auditValueText(f.old)}
                    </TableCell>
                  )}
                  {showNew && (
                    <TableCell dir="auto" sx={{ overflowWrap: 'anywhere' }}>
                      {auditValueText(f.new)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
}
