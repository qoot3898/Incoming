import { useMemo } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { payrollApi, payrollKeys } from './api';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { col } from '@/components/tables/columns';
import { useListState } from '@/hooks/useListState';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import { todayIso } from '@/utils/format';
import { tasksKeys } from '@/features/tasks/api';
import { workersKeys } from '@/features/workers/api';
import type { Q, S } from '@/types/api';

type Row = S<'PayrollNoticeListItem'>;

export default function PayrollNoticesPage() {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const enumOptions = useEnumOptions();
  const list = useListState({ Status: '', Kind: '', Search: '' });
  const params = list.params as unknown as Q<'ListPayrollNotices'>;
  const query = useQuery({ queryKey: [...payrollKeys.all, 'list', params], queryFn: () => payrollApi.list(params), placeholderData: keepPreviousData });
  const invalidate = [payrollKeys.all, tasksKeys.all, workersKeys.all, ['onboarding'], ['leaves'], ['penalties'], ['terminations']];
  const deliver = useApiMutation((v: S<'RecordNoticeDeliveryRequest'> & { id: number }) => payrollApi.recordDelivery(v.id, v), { invalidate, rethrow: true });
  const confirm = useApiMutation((id: number) => payrollApi.confirm(id), { invalidate, success: t('payroll.confirmed') });

  const deliverAsync = deliver.mutateAsync;
  const { mutate: confirmNotice, isPending: confirmPending } = confirm;
  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      { field: 'kind', headerName: t('payroll.kind'), width: 140, valueFormatter: (v: string) => label('PayrollNoticeKind', v) },
      col.num<Row>('employeeNumber', t('fields.employeeNumber')),
      col.text<Row>('name', t('fields.name'), { minWidth: 170, renderCell: (p) => <RouterLink to={`/workers/${p.row.employeeId}`}>{p.row.name}</RouterLink> }),
      col.text<Row>('workSiteName', t('fields.workSite')),
      col.date<Row>('effectiveDate', t('payroll.effectiveDate')),
      col.text<Row>('details', t('common.details'), { minWidth: 160 }),
      col.status<Row>('status', t('fields.status'), 'PayrollNoticeStatus', { width: 140 }),
      col.date<Row>('deliveredOn', t('payroll.deliveredOn')),
      col.dateTime<Row>('confirmedAt', t('payroll.confirmedAt')),
      {
        field: 'actions',
        headerName: '',
        width: 170,
        sortable: false,
        renderCell: (p) => (
          <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
            {p.row.status === 'AwaitingDelivery' && (
              <ActionFormButton<S<'RecordNoticeDeliveryRequest'>>
                label={t('payroll.recordDelivery')}
                size="small"
                fields={[
                  { name: 'deliveredOn', kind: 'date', label: t('payroll.deliveredOn'), required: true, half: true },
                  { name: 'deliveredBy', kind: 'text', label: t('payroll.deliveredBy'), half: true, maxLength: 200 },
                ]}
                defaultValues={{ deliveredOn: todayIso() }}
                onSubmit={(v) => deliverAsync({ ...v, id: p.row.noticeId })}
              />
            )}
            {p.row.status === 'Delivered' && (
              <Button size="small" variant="contained" color="success" onClick={() => confirmNotice(p.row.noticeId)} disabled={confirmPending}>
                {t('payroll.confirmReceipt')}
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [confirmNotice, confirmPending, deliverAsync, label, t],
  );

  return (
    <Box>
      <PageHeader title={t('nav.items.payroll')} subtitle={t('payroll.subtitle')} />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} options={enumOptions('PayrollNoticeStatus', ENUMS.PayrollNoticeStatus)} onChange={(v) => list.setFilter('Status', v)} />
        <SelectField label={t('payroll.kind')} value={list.filters.Kind} options={enumOptions('PayrollNoticeKind', ENUMS.PayrollNoticeKind)} onChange={(v) => list.setFilter('Kind', v)} />
      </FilterBar>
      <ServerDataGrid<Row>
        data={query.data}
        loading={query.isFetching}
        error={query.error}
        getRowId={(r) => r.noticeId}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={list.setPageSize}
        columns={columns}
      />
    </Box>
  );
}
