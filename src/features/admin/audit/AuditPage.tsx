import { useState } from 'react';
import { Box, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { brand } from '@/app/theme/brand';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, auditApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { LoadingState, ErrorState } from '@/components/common/States';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
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
  const query = useQuery({ queryKey: adminKeys.auditList(params), queryFn: ({ signal }) => auditApi.search(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Outcome', kind: 'select', label: t('audit.outcome'), options: enumOptions('AuditOutcome', ENUMS.AuditOutcome) },
    { key: 'From', kind: 'date', label: t('common.from') },
    { key: 'To', kind: 'date', label: t('common.to') },
  ];
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <PageContainer>
      <PageHeader title={t('nav.items.audit')} />
      <FilterPanel list={list} filters={filters} />
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        onRetry={query.refetch}
        filtered={isFiltered(list, filters)}
        onClearFilters={() => clearFilters(list, filters)}
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
    </PageContainer>
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
