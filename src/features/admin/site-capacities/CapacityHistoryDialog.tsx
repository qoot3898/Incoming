import { Button, Dialog, DialogActions, DialogContent, DialogTitle, useMediaQuery, useTheme } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, laborSettingsApi } from '../api';
import { ErrorState } from '@/components/common/States';
import { FileActionButton } from '@/components/common/FileButtons';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { col } from '@/components/tables/columns';
import { formatBytes } from '@/utils/format';
import type { S } from '@/types/api';

type Change = S<'SiteCapacityChangeItem'>;

/** A capacity in the history: the number, or "no limit" for `null`. */
function useCapacityText() {
  const { t } = useTranslation();
  return (v: number | null) => (v === null ? t('capacity.unlimited') : String(v));
}

/**
 * Capacity changes of one site, newest first (TL-N7). Opening a change's PDF decision needs the change
 * permission (`canOpenFiles`) and is recorded in the audit log by the API.
 */
export function CapacityHistoryDialog({ site, canOpenFiles, onClose }: { site: S<'SiteCapacityItem'>; canOpenFiles: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const text = useCapacityText();
  const changes = useQuery({ queryKey: adminKeys.siteCapacityChanges(site.workSiteId), queryFn: () => laborSettingsApi.siteCapacityChanges(site.workSiteId) });

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth fullScreen={phone}>
      <DialogTitle>{t('capacity.historyFor', { site: `${site.number} — ${site.name ?? ''}` })}</DialogTitle>
      <DialogContent>
        {changes.error ? (
          <ErrorState error={changes.error} onRetry={() => void changes.refetch()} />
        ) : (
          <LocalDataGrid<Change>
            rows={changes.data ?? []}
            loading={changes.isLoading}
            getRowId={(r) => r.id}
            emptyText={t('capacity.noChanges')}
            columns={[
              col.dateTime<Change>('changedAt', t('capacity.changedAt'), { width: 170 }),
              { field: 'change', headerName: t('capacity.change'), flex: 1, minWidth: 160, sortable: false, valueGetter: (_: unknown, r: Change) => t('capacity.fromTo', { from: text(r.previousCapacity), to: text(r.newCapacity) }) },
              col.text<Change>('changedBy', t('capacity.changedBy')),
              {
                field: 'fileName',
                headerName: t('capacity.decision'),
                flex: 1,
                minWidth: 200,
                sortable: false,
                renderCell: (p) => {
                  if (!p.row.fileName) return '—';
                  const label = `${p.row.fileName}${p.row.fileSize ? ` (${formatBytes(p.row.fileSize)})` : ''}`;
                  if (!canOpenFiles) return label;
                  return <FileActionButton label={label} fileName={p.row.fileName} icon={<AttachFileIcon />} action={() => laborSettingsApi.openSiteCapacityFile(p.row.id)} />;
                },
              },
            ]}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
