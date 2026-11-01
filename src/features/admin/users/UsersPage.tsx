import { useState, useMemo } from 'react';
import { Box, Button, Stack } from '@mui/material';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, usersApi } from '../api';
import { TempPasswordDialog } from '../TempPasswordDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { FilterBar } from '@/components/tables/FilterBar';
import { SearchField } from '@/components/tables/SearchField';
import { ServerDataGrid } from '@/components/tables/ServerDataGrid';
import { SelectField } from '@/components/forms/SelectField';
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
  const query = useQuery({ queryKey: [...adminKeys.users, 'list', params], queryFn: () => usersApi.list(params), placeholderData: keepPreviousData });
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
    <Box>
      <PageHeader
        title={t('nav.items.users')}
        subtitle={t('users.subtitle')}
        actions={
          <Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setCreateOpen(true)}>
            {t('users.new')}
          </Button>
        }
      />
      <FilterBar onReset={list.reset}>
        <SearchField label={t('common.search')} value={list.filters.Search} onCommit={(v) => list.setFilter('Search', v)} />
        <SelectField label={t('fields.status')} value={list.filters.Status} emptyLabel={false} options={enumOptions('UserStatusFilter', ENUMS.UserStatusFilter)} onChange={(v) => list.setFilter('Status', v)} />
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
    </Box>
  );
}
