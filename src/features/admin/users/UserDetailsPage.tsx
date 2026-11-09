import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Grid2 as Grid, Stack, Typography, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { useTranslation } from 'react-i18next';
import { adminKeys, usersApi } from '../api';
import { TempPasswordDialog } from '../TempPasswordDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { ToneChip } from '@/components/common/StatusChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDateTime } from '@/utils/format';
import { useAuth } from '@/app/providers/authContext';
import { PERMISSIONS } from '@/constants/permissions';
import { auditLink } from '../audit/auditLinks';
import type { S } from '@/types/api';

type Confirm = 'unlock' | 'reset' | 'signout' | 'toggle' | null;

export default function UserDetailsPage() {
  const { t } = useTranslation();
  const id = Number(useParams().userId);
  const { can } = useAuth();
  const canAudit = can([PERMISSIONS.auditView]);
  const query = useQuery({ queryKey: [...adminKeys.users, 'detail', id], queryFn: () => usersApi.get(id) });
  const roles = useQuery({ queryKey: [...adminKeys.users, 'assignable'], queryFn: usersApi.assignableRoles });
  const invalidate = [adminKeys.users, adminKeys.roles];
  const update = useApiMutation((v: S<'UpdateUserRequest'>) => usersApi.update(id, v), { invalidate, rethrow: true });
  const setRoles = useApiMutation((roleIds: number[]) => usersApi.setRoles(id, { roleIds }), { invalidate });
  const setActive = useApiMutation((active: boolean) => usersApi.setActive(id, { active }), { invalidate });
  const unlock = useApiMutation(() => usersApi.unlock(id), { invalidate });
  const reset = useApiMutation(() => usersApi.resetPassword(id), { invalidate, success: false, onSuccess: (r) => setTemp(r) });
  const signOut = useApiMutation(() => usersApi.forceSignOut(id), { invalidate, success: t('users.signedOut') });
  const [temp, setTemp] = useState<S<'TemporaryPasswordResult'> | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[] | null>(null);

  return (
    <QueryBoundary query={query}>
      {(u) => {
        const current = selectedRoles ?? u.roles.map((r) => r.roleId);
        const currentSet = new Set(current);
        const dirty = selectedRoles !== null && JSON.stringify([...selectedRoles].sort()) !== JSON.stringify(u.roles.map((r) => r.roleId).sort());
        const runConfirm = () => {
          const done = { onSettled: () => setConfirm(null) };
          if (confirm === 'unlock') unlock.mutate(undefined, done);
          if (confirm === 'reset') reset.mutate(undefined, done);
          if (confirm === 'signout') signOut.mutate(undefined, done);
          if (confirm === 'toggle') setActive.mutate(!u.isActive, done);
        };
        return (
          <Box>
            <PageHeader
              title={u.fullName ?? u.userName ?? ''}
              subtitle={u.userName}
              breadcrumbs={[{ label: t('nav.items.users'), to: '/admin/users' }]}
              meta={
                <Stack direction="row" spacing={1}>
                  <ToneChip tone={u.isActive ? 'success' : 'neutral'} label={u.isActive ? t('users.active') : t('users.inactive')} />
                  {u.lockedUntil && <ToneChip tone="error" label={t('users.lockedUntil', { date: formatDateTime(u.lockedUntil) })} />}
                </Stack>
              }
              actions={
                <>
                  <ActionFormButton<S<'UpdateUserRequest'>>
                    label={t('common.edit')}
                    fields={[
                      { name: 'fullName', kind: 'text', label: t('users.fullName'), required: true, maxLength: 200 },
                      { name: 'employeeNo', kind: 'text', label: t('users.employeeNo'), half: true, maxLength: 50 },
                      { name: 'jobTitle', kind: 'text', label: t('users.jobTitle'), half: true, maxLength: 200 },
                      { name: 'email', kind: 'text', label: t('users.email'), half: true, maxLength: 200 },
                      { name: 'phoneNumber', kind: 'text', label: t('fields.phone'), half: true, maxLength: 50 },
                    ]}
                    defaultValues={u}
                    onSubmit={(v) => update.mutateAsync({ ...v, id: u.id, concurrencyStamp: u.concurrencyStamp })}
                  />
                  <Button variant="outlined" color={u.isActive ? 'error' : 'success'} onClick={() => setConfirm('toggle')}>
                    {u.isActive ? t('users.deactivate') : t('users.activate')}
                  </Button>
                  {u.lockedUntil && (
                    <Button variant="outlined" onClick={() => setConfirm('unlock')}>
                      {t('users.unlock')}
                    </Button>
                  )}
                  <Button variant="outlined" onClick={() => setConfirm('reset')}>
                    {t('users.resetPassword')}
                  </Button>
                  <Button variant="outlined" color="inherit" onClick={() => setConfirm('signout')}>
                    {t('users.forceSignOut')}
                  </Button>
                  {canAudit && (
                    <>
                      {/* TL-N6: what this user did (incl. failed sign-ins), and the history of the account itself. */}
                      <Button component={RouterLink} to={auditLink({ ActorUserId: u.id })} startIcon={<PersonSearchOutlinedIcon />}>
                        {t('audit.userActivity')}
                      </Button>
                      <Button component={RouterLink} to={auditLink({ EntityType: 'User', EntityId: String(u.id), IncludeChanges: true })} startIcon={<HistoryOutlinedIcon />}>
                        {t('audit.accountHistory')}
                      </Button>
                    </>
                  )}
                </>
              }
            />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionCard title={t('users.details')}>
                  <InfoGrid
                    columns={2}
                    items={[
                      { label: t('users.userName'), value: u.userName },
                      { label: t('users.employeeNo'), value: u.employeeNo },
                      { label: t('users.jobTitle'), value: u.jobTitle },
                      { label: t('users.email'), value: u.email },
                      { label: t('fields.phone'), value: u.phoneNumber },
                      { label: t('users.mustChangePassword'), value: u.mustChangePassword ? t('common.yes') : t('common.no') },
                      { label: t('users.passwordChangedAt'), value: formatDateTime(u.passwordChangedAt) },
                      { label: t('users.lastLogin'), value: formatDateTime(u.lastLoginAt) },
                      { label: t('common.createdAt'), value: formatDateTime(u.createdAt) },
                    ]}
                  />
                </SectionCard>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionCard
                  title={t('users.roles')}
                  action={
                    <Button size="small" variant="contained" disabled={!dirty || setRoles.isPending} onClick={() => setRoles.mutate(current, { onSuccess: () => setSelectedRoles(null) })}>
                      {t('common.save')}
                    </Button>
                  }
                >
                  {(roles.data ?? []).length === 0 && <Typography variant="body2" color="text.secondary">{t('common.loading')}</Typography>}
                  <Stack>
                    {(roles.data ?? []).map((r) => (
                      <FormControlLabel
                        key={r.id}
                        control={<Checkbox checked={currentSet.has(r.id)} onChange={(e) => setSelectedRoles(e.target.checked ? [...current, r.id] : current.filter((x) => x !== r.id))} />}
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={600} component="div">
                              {r.displayName} {r.isSuperAdmin && <ToneChip tone="warning" label={t('roles.superAdmin')} />}
                            </Typography>
                            {r.description && (
                              <Typography variant="caption" color="text.secondary">
                                {r.description}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', mb: 1, '& .MuiCheckbox-root': { pt: 0.25 } }}
                      />
                    ))}
                  </Stack>
                  {dirty && <Alert severity="info" sx={{ mt: 1 }}>{t('users.unsavedRoles')}</Alert>}
                </SectionCard>
              </Grid>
            </Grid>
            <ConfirmDialog
              open={confirm !== null}
              title={t(`users.confirm.${confirm ?? 'reset'}.title`)}
              message={t(`users.confirm.${confirm ?? 'reset'}.message`)}
              destructive={confirm === 'toggle' && u.isActive}
              loading={unlock.isPending || reset.isPending || signOut.isPending || setActive.isPending}
              onClose={() => setConfirm(null)}
              onConfirm={runConfirm}
            />
            <TempPasswordDialog result={temp} onClose={() => setTemp(null)} />
          </Box>
        );
      }}
    </QueryBoundary>
  );
}
