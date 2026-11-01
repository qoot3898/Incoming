import { useState } from 'react';
import { Box, Button } from '@mui/material';
import BackupOutlinedIcon from '@mui/icons-material/BackupOutlined';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, backupsApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatBytes, formatDateTime } from '@/utils/format';
import type { S } from '@/types/api';

type F = S<'DatabaseBackupFile'>;

export default function BackupsPage() {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: adminKeys.backups, queryFn: backupsApi.overview });
  const create = useApiMutation(() => backupsApi.create(), { invalidate: [adminKeys.backups], success: t('backups.created') });
  const [confirm, setConfirm] = useState(false);
  return (
    <Box>
      <PageHeader
        title={t('nav.items.backups')}
        subtitle={t('backups.subtitle')}
        actions={
          <Button variant="contained" startIcon={<BackupOutlinedIcon />} onClick={() => setConfirm(true)} disabled={create.isPending}>
            {create.isPending ? t('backups.creating') : t('backups.create')}
          </Button>
        }
      />
      <QueryBoundary query={query}>
        {(d) => (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <SectionCard title={t('backups.overview')}>
              <InfoGrid
                items={[
                  { label: t('backups.directory'), value: <span dir="ltr">{d.directory}</span> },
                  { label: t('backups.dailyAt'), value: d.dailyAt ?? t('backups.notScheduled') },
                  { label: t('backups.source'), value: d.serverHistory ? t('backups.serverHistory') : t('backups.auditHistory') },
                ]}
              />
            </SectionCard>
            <LocalDataGrid<F>
              rows={d.files}
              getRowId={(r) => `${r.path}-${r.finishedAt}`}
              emptyText={t('backups.none')}
              columns={[
                { field: 'finishedAt', headerName: t('backups.finishedAt'), width: 180, valueFormatter: (v: string) => formatDateTime(v) },
                { field: 'path', headerName: t('backups.path'), flex: 2, minWidth: 220 },
                { field: 'sizeBytes', headerName: t('attachments.size'), width: 120, valueFormatter: (v: number) => formatBytes(v) },
                { field: 'userName', headerName: t('backups.user'), width: 160 },
              ]}
            />
          </Box>
        )}
      </QueryBoundary>
      <ConfirmDialog open={confirm} title={t('backups.create')} message={t('backups.confirm')} loading={create.isPending} onClose={() => setConfirm(false)} onConfirm={() => create.mutate(undefined, { onSettled: () => setConfirm(false) })} />
    </Box>
  );
}
