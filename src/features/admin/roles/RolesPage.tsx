import { useMemo } from 'react';
import { Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { GridColDef } from '@mui/x-data-grid';
import { adminKeys, rolesApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/States';
import { ToneChip } from '@/components/common/StatusChip';
import { LocalDataGrid } from '@/components/tables/ServerDataGrid';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { col } from '@/components/tables/columns';
import { useApiMutation } from '@/hooks/useApiMutation';
import type { S } from '@/types/api';

type Row = S<'RoleListItem'>;

export default function RolesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: [...adminKeys.roles, 'list'], queryFn: rolesApi.list });
  const create = useApiMutation(rolesApi.create, { invalidate: [adminKeys.roles], rethrow: true, success: t('roles.created'), onSuccess: (r) => navigate(`/admin/roles/${r.id}`) });
  const columns = useMemo<GridColDef<Row>[]>(
    () => [
      col.text<Row>('displayName', t('roles.displayName'), { flex: 1.3 }),
      col.text<Row>('name', t('roles.code')),
      col.text<Row>('description', t('common.description'), { flex: 2 }),
      col.num<Row>('memberCount', t('roles.members')),
      col.num<Row>('permissionCount', t('roles.permissions')),
      {
        field: 'flags',
        headerName: '',
        width: 170,
        renderCell: (p) => (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', height: '100%' }}>
            {p.row.isSystem && <ToneChip tone="info" label={t('roles.system')} />}
            {p.row.isSuperAdmin && <ToneChip tone="warning" label={t('roles.superAdmin')} />}
          </Box>
        ),
      },
    ],
    [t],
  );

  return (
    <PageContainer>
      <PageHeader
        title={t('nav.items.roles')}
        actions={
          <ActionFormButton<S<'CreateRoleRequest'>>
            label={t('roles.new')}
            variant="contained"
            startIcon={<AddIcon />}
            description={t('roles.newHint')}
            fields={[
              { name: 'name', kind: 'text', label: t('roles.code'), required: true, half: true, maxLength: 100, helperText: t('roles.codeHint') },
              { name: 'displayName', kind: 'text', label: t('roles.displayName'), required: true, half: true, maxLength: 200 },
              { name: 'description', kind: 'textarea', label: t('common.description'), maxLength: 500 },
            ]}
            onSubmit={(v) => create.mutateAsync(v)}
          />
        }
      />
      {query.error ? (
        <ErrorState error={query.error} />
      ) : (
        <LocalDataGrid<Row>
          rows={query.data ?? []}
          loading={query.isLoading}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/admin/roles/${r.id}`)}
          columns={columns}
        />
      )}
    </PageContainer>
  );
}
