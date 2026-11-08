import { useState, useMemo } from 'react';
import { Button, Stack } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, usersApi } from '../api';
import { TempPasswordDialog } from '../TempPasswordDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { FilterPanel } from '@/components/tables/FilterPanel';
import { clearFilters, isFiltered, type FilterDef } from '@/components/tables/filters';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { FormDialog } from '@/components/forms/FormDialog';
import { col } from '@/components/tables/columns';
import { ToneChip } from '@/components/common/StatusChip';
import { useListState } from '@/hooks/useListState';
import { useEnumOptions } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { ENUMS } from '@/constants/enums';
import type { Q, S } from '@/types/api';

type Row = S<'UserListItem'>;
type CreateValues = Omit<S<'CreateUserRequest'>, 'roleIds'> & { roleId: number | null };

export default function UsersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const enumOptions = useEnumOptions();
  const list = useListState({ Search: '', Status: 'All' });
  const params = list.params as unknown as Q<'ListUsers'>;
  const query = useQuery({ queryKey: adminKeys.userList(params), queryFn: ({ signal }) => usersApi.list(params, signal), placeholderData: keepPreviousData });
  const filters: FilterDef<typeof list.filters>[] = [
    { key: 'Search', kind: 'search', label: t('common.search') },
    { key: 'Status', kind: 'select', label: t('fields.status'), emptyLabel: false, options: enumOptions('UserStatusFilter', ENUMS.UserStatusFilter) },
  ];
  const [createOpen, setCreateOpen] = useState(false);
  const [temp, setTemp] = useState<S<'TemporaryPasswordResult'> | null>(null);
  const roles = useQuery({ queryKey: [...adminKeys.users, 'assignable'], queryFn: usersApi.assignableRoles, enabled: createOpen });
  const create = useApiMutation(usersApi.create, { invalidate: [adminKeys.users], rethrow: true, success: t('users.created'), onSuccess: setTemp });

  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('userName', t('users.userName')),
      col.text<Row>('fullName', t('users.fullName'), { flex: 1.3 }),
      col.text<Row>('employeeNo', t('users.employeeNo')),
      col.text<Row>('jobTitle', t('users.jobTitle')),
      { field: 'roles', headerName: t('users.roles'), flex: 1.5, minWidth: 180, valueGetter: (_: unknown, r: Row) => r.roles.join('، ') },
      {
        field: 'state',
        headerName: t('fields.status'),
        width: 190,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
            <ToneChip tone={p.row.isActive ? 'success' : 'neutral'} label={p.row.isActive ? t('users.active') : t('users.inactive')} />
            {p.row.isLockedOut && <ToneChip tone="error" label={t('users.locked')} />}
          </Stack>
        ),
      },
      col.dateTime<Row>('lastLoginAt', t('users.lastLogin')),
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.users')}
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setCreateOpen(true)}>
            {t('users.new')}
          </Button>
        }
      />
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
        onRowClick={(r) => navigate(`/admin/users/${r.id}`)}
        columns={columns}
      />
      <FormDialog<CreateValues>
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('users.new')}
        description={t('users.newHint')}
        fields={[
          { name: 'userName', kind: 'text', label: t('users.userName'), required: true, half: true, maxLength: 100 },
          { name: 'fullName', kind: 'text', label: t('users.fullName'), required: true, half: true, maxLength: 200 },
          { name: 'employeeNo', kind: 'text', label: t('users.employeeNo'), half: true, maxLength: 50 },
          { name: 'jobTitle', kind: 'text', label: t('users.jobTitle'), half: true, maxLength: 200 },
          { name: 'email', kind: 'text', label: t('users.email'), half: true, maxLength: 200 },
          { name: 'phoneNumber', kind: 'text', label: t('fields.phone'), half: true, maxLength: 50 },
          { name: 'roleId', kind: 'select', label: t('users.initialRole'), helperText: t('users.initialRoleHint'), options: (roles.data ?? []).map((r) => ({ value: r.id, label: r.displayName ?? '' })) },
        ]}
        onSubmit={({ roleId, ...v }) => create.mutateAsync({ ...v, roleIds: roleId ? [roleId] : [] })}
      />
      <TempPasswordDialog result={temp} onClose={() => setTemp(null)} />
    </PageContainer>
  );
}
