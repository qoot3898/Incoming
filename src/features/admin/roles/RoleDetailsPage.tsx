import { useMemo, useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, Grid2 as Grid, List, ListItem, ListItemText, Stack, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminKeys, rolesApi } from '../api';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary, EmptyState } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { ToneChip } from '@/components/common/StatusChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import type { S } from '@/types/api';

export default function RoleDetailsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = Number(useParams().roleId);
  const role = useQuery({ queryKey: [...adminKeys.roles, 'detail', id], queryFn: () => rolesApi.get(id) });
  const catalog = useQuery({ queryKey: [...adminKeys.roles, 'catalog'], queryFn: rolesApi.permissions, staleTime: 600_000 });
  const invalidate = [adminKeys.roles, adminKeys.users];
  const update = useApiMutation((v: S<'UpdateRoleRequest'>) => rolesApi.update(id, v), { invalidate, rethrow: true });
  const setPerms = useApiMutation((v: S<'SetRolePermissionsRequest'>) => rolesApi.setPermissions(id, v), { invalidate, onSuccess: () => setSelected(null) });
  const remove = useApiMutation(() => rolesApi.remove(id), { invalidate, success: t('roles.deleted'), onSuccess: () => navigate('/admin/roles') });
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <QueryBoundary query={role}>
      {(r) => {
        const current = selected ?? new Set(r.permissions.filter((x): x is string => !!x));
        const original = new Set(r.permissions);
        const dirty = selected !== null && (selected.size !== original.size || [...selected].some((x) => !original.has(x)));
        const toggle = (code: string, on: boolean) => {
          const next = new Set(current);
          if (on) next.add(code);
          else next.delete(code);
          setSelected(next);
        };
        return (
          <Box>
            <PageHeader
              title={r.displayName ?? r.name ?? ''}
              subtitle={r.description}
              breadcrumbs={[{ label: t('nav.items.roles'), to: '/admin/roles' }]}
              meta={
                <Stack direction="row" spacing={1}>
                  {r.isSystem && <ToneChip tone="info" label={t('roles.system')} />}
                  {r.isSuperAdmin && <ToneChip tone="warning" label={t('roles.superAdmin')} />}
                </Stack>
              }
              actions={
                <>
                  <ActionFormButton<S<'UpdateRoleRequest'>>
                    label={t('common.edit')}
                    fields={[
                      { name: 'displayName', kind: 'text', label: t('roles.displayName'), required: true, maxLength: 200 },
                      { name: 'description', kind: 'textarea', label: t('common.description'), maxLength: 500 },
                    ]}
                    defaultValues={r}
                    onSubmit={(v) => update.mutateAsync({ ...v, id: r.id, concurrencyStamp: r.concurrencyStamp })}
                  />
                  {!r.isSystem && (
                    <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)}>
                      {t('common.delete')}
                    </Button>
                  )}
                </>
              }
            />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, lg: 8 }}>
                <SectionCard
                  title={t('roles.permissionMatrix')}
                  subheader={r.isSuperAdmin ? t('roles.superAdminHint') : t('roles.matrixHint', { count: current.size })}
                  action={
                    <Stack direction="row" spacing={1}>
                      <Button size="small" color="inherit" disabled={!dirty} onClick={() => setSelected(null)}>
                        {t('common.discard')}
                      </Button>
                      <Button size="small" variant="contained" disabled={!dirty || setPerms.isPending} onClick={() => setPerms.mutate({ permissionCodes: [...current], concurrencyStamp: r.concurrencyStamp })}>
                        {t('common.save')}
                      </Button>
                    </Stack>
                  }
                >
                  <QueryBoundary query={catalog}>
                    {(groups) => (
                      <Stack spacing={1}>
                        {groups.map((g) => (
                          <PermissionGroup key={g.code} group={g} current={current} onToggle={toggle} disabled={r.isSuperAdmin} />
                        ))}
                      </Stack>
                    )}
                  </QueryBoundary>
                </SectionCard>
              </Grid>
              <Grid size={{ xs: 12, lg: 4 }}>
                <SectionCard title={t('roles.members')} noPadding>
                  {r.members.length === 0 ? (
                    <EmptyState title={t('roles.noMembers')} />
                  ) : (
                    <List dense>
                      {r.members.map((m) => (
                        <ListItem key={m.userId} divider secondaryAction={!m.isActive ? <ToneChip tone="neutral" label={t('users.inactive')} /> : undefined}>
                          <ListItemText primary={<RouterLink to={`/admin/users/${m.userId}`}>{m.fullName || m.userName}</RouterLink>} secondary={m.userName} />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </SectionCard>
              </Grid>
            </Grid>
            <ConfirmDialog
              open={confirmDelete}
              title={t('roles.delete')}
              message={t('roles.deleteConfirm', { name: r.displayName })}
              destructive
              loading={remove.isPending}
              onClose={() => setConfirmDelete(false)}
              onConfirm={() => remove.mutate(undefined, { onSettled: () => setConfirmDelete(false) })}
            />
          </Box>
        );
      }}
    </QueryBoundary>
  );
}

function PermissionGroup({ group, current, onToggle, disabled }: { group: S<'PermissionModuleGroup'>; current: Set<string>; onToggle: (code: string, on: boolean) => void; disabled: boolean }) {
  const { t } = useTranslation();
  const codes = useMemo(() => group.permissions.map((p) => p.code).filter((c): c is string => !!c), [group]);
  const count = codes.filter((c) => current.has(c)).length;
  return (
    <Accordion disableGutters variant="outlined" sx={{ '&:before': { display: 'none' }, borderRadius: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
          <Checkbox
            size="small"
            checked={count === codes.length && codes.length > 0}
            indeterminate={count > 0 && count < codes.length}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => codes.forEach((c) => onToggle(c, e.target.checked))}
          />
          <Typography fontWeight={600} sx={{ flex: 1 }}>
            {group.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {count}/{codes.length}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 0.5 }}>
          {group.permissions.map((p) => (
            <FormControlLabel
              key={p.code}
              disabled={disabled}
              control={<Checkbox size="small" checked={!!p.code && current.has(p.code)} onChange={(e) => p.code && onToggle(p.code, e.target.checked)} />}
              label={
                <Box>
                  <Typography variant="body2" component="div">
                    {p.name} {p.isSensitive && <ToneChip tone="error" label={t('roles.sensitive')} />}
                  </Typography>
                  {p.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {p.description}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled" sx={{ direction: 'ltr', display: 'inline-block' }}>
                    {p.code}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', '& .MuiCheckbox-root': { pt: 0.25 } }}
            />
          ))}
        </Box>
        {group.permissions.some((p) => p.isSensitive) && <Alert severity="warning" sx={{ mt: 1 }}>{t('roles.sensitiveHint')}</Alert>}
      </AccordionDetails>
    </Accordion>
  );
}
