import { useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, TextField } from '@mui/material';
import { brand } from '@/app/theme/brand';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, auditApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingState, ErrorState } from '@/components/common/States';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'AuditLogItem'>;

export default function AuditPage() {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const list = useListState({ From: '', To: '', Search: '', Outcome: '' });
  const params = list.params as unknown as Q<'SearchAudit'>;
  const query = useQuery({ queryKey: [...adminKeys.audit, params], queryFn: () => auditApi.search(params), placeholderData: keepPreviousData });
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <Box>
      <PageHeader title={t('nav.items.audit')} subtitle={t('audit.subtitle')} />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('audit.outcome')} value={list.filters.Outcome} options={enumOptions('AuditOutcome', ENUMS.AuditOutcome)} onChange={(v) => list.setFilter('Outcome', v)} />
        <TextField type="date" label={t('common.from')} value={list.filters.From} onChange={(e) => list.setFilter('From', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField type="date" label={t('common.to')} value={list.filters.To} onChange={(e) => list.setFilter('To', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        onRowClick={(r) => setSelected(r.id)}
        columns={[
          col.dateTime<Row>('occurredAt', t('audit.occurredAt')),
          col.text<Row>('actorName', t('audit.actor')),
          col.text<Row>('actionName', t('audit.action')),
          { field: 'entity', headerName: t('audit.entity'), width: 170, valueGetter: (_: unknown, r: Row) => [r.entityType, r.entityId].filter(Boolean).join(' #') },
          col.text<Row>('summary', t('audit.summary'), { flex: 2 }),
          col.status<Row>('outcome', t('audit.outcome'), 'AuditOutcome', { width: 110 }),
          col.text<Row>('ipAddress', t('audit.ip'), { width: 130, flex: 0 }),
        ]}
      />
      <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="md">
        <DialogTitle>{t('audit.entryDetails', { id: selected })}</DialogTitle>
        <DialogContent>{selected !== null && <AuditDetail id={selected} />}</DialogContent>
      </Dialog>
    </Box>
  );
}

function AuditDetail({ id }: { id: number }) {
  const q = useQuery({ queryKey: [...adminKeys.audit, 'detail', id], queryFn: () => auditApi.get(id) });
  if (q.isLoading) return <LoadingState minHeight={120} />;
  if (q.error) return <ErrorState error={q.error} />;
  return (
    <Box component="pre" sx={{ m: 0, p: 2, bgcolor: brand.creamSoft, borderRadius: 2, fontSize: 12, overflow: 'auto', direction: 'ltr', textAlign: 'left', maxHeight: '60vh' }}>
      {JSON.stringify(q.data, null, 2)}
    </Box>
  );
}
