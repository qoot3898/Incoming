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
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={phone}>
      <DialogTitle>{t('audit.entryDetails', { id: row.id })}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 0.5 }}>
          <EntryFacts row={row} />
          <EntryJumps row={row} onFilter={onFilter} />
          <EntryChanges row={row} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

const ltr = (v: string | null | undefined) => (v ? <bdi dir="ltr">{v}</bdi> : null);

function EntryFacts({ row }: { row: Row }) {
  const { t } = useTranslation();
  const actor = [row.actorName, row.actorUserName && `(${row.actorUserName})`].filter(Boolean).join(' ');
  const agent = row.userAgent ? (
    <Box component="span" dir="ltr" sx={{ fontSize: '0.75rem', fontWeight: 400 }}>
      {row.userAgent}
    </Box>
  ) : null;
  return (
    <InfoGrid
      columns={3}
      items={[
        { label: t('audit.occurredAt'), value: formatDateTime(row.occurredAt) },
        { label: t('audit.actor'), value: actor },
        { label: t('audit.outcome'), value: <StatusChip enumName="AuditOutcome" value={row.outcome} /> },
        { label: t('audit.action'), value: row.actionName },
        { label: t('audit.actionCode'), value: ltr(row.actionCode) },
        { label: t('audit.entity'), value: [row.entityType, row.entityId].filter(Boolean).join(' #') },
        { label: t('audit.summary'), value: row.summary, span: 3 },
        { label: t('audit.ip'), value: ltr(row.ipAddress) },
        { label: t('audit.correlationId'), value: ltr(row.correlationId), span: 2 },
        { label: t('audit.userAgent'), value: agent, span: 3 },
      ]}
    />
  );
}

/** Re-filters the list around this entry: the actor's activity, the record's history, the same request. */
function EntryJumps({ row, onFilter }: Pick<Props, 'row' | 'onFilter'>) {
  const { t } = useTranslation();
  const { actorUserId, entityType, entityId, correlationId } = row;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {actorUserId != null && (
        <Button size="small" variant="outlined" startIcon={<PersonSearchOutlinedIcon />} onClick={() => onFilter({ ActorUserId: String(actorUserId) })}>
          {t('audit.userActivity')}
        </Button>
      )}
      {entityType && entityId && (
        <Button size="small" variant="outlined" startIcon={<HistoryOutlinedIcon />} onClick={() => onFilter({ EntityType: entityType, EntityId: entityId, IncludeChanges: true })}>
          {t('audit.recordHistory')}
        </Button>
      )}
      {correlationId && (
        <Button size="small" variant="outlined" startIcon={<LinkOutlinedIcon />} onClick={() => onFilter({ CorrelationId: correlationId })}>
          {t('audit.sameRequest')}
        </Button>
      )}
    </Stack>
  );
}

/** Old → new values: from the row when listed with `includeChanges`, otherwise read from the entry itself. */
function EntryChanges({ row }: { row: Row }) {
  const { t } = useTranslation();
  const inline = parseAuditChanges(row.changes);
  const detail = useQuery({ queryKey: [...adminKeys.audit, 'detail', row.id], queryFn: () => auditApi.get(row.id), enabled: inline.length === 0 });
  const changes = inline.length ? inline : parseAuditChanges(detail.data);
  return (
    <>
      <Box>
        <Typography variant="subtitle1" component="h3" sx={{ mb: 1 }}>
          {t('audit.changes')}
        </Typography>
        <ChangesBody changes={changes} loading={inline.length === 0 && detail.isLoading} error={inline.length === 0 ? detail.error : null} onRetry={() => void detail.refetch()} />
      </Box>
      {detail.data !== undefined && <RawEntry data={detail.data} />}
    </>
  );
}

function ChangesBody({ changes, loading, error, onRetry }: { changes: AuditEntityChange[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const { t } = useTranslation();
  if (loading) return <LoadingState minHeight={100} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (changes.length === 0) {
    return (
      <Paper variant="outlined">
        <EmptyState title={t('audit.noChanges')} />
      </Paper>
    );
  }
  return (
    <Stack spacing={2}>
      {changes.map((c) => (
        <ChangeTable key={`${c.entity}|${c.id}|${c.operation}`} change={c} />
      ))}
    </Stack>
  );
}

function RawEntry({ data }: { data: unknown }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button size="small" color="inherit" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? t('audit.hideRaw') : t('audit.showRaw')}
      </Button>
      <Collapse in={open} unmountOnExit>
        <Box component="pre" sx={{ m: 0, mt: 1, p: 2, bgcolor: brand.creamSoft, borderRadius: 2, fontSize: 12, overflow: 'auto', direction: 'ltr', textAlign: 'left', maxHeight: '40vh' }}>
          {JSON.stringify(data, null, 2)}
        </Box>
      </Collapse>
    </Box>
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
