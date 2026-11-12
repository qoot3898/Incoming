import { useMemo, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminKeys, usersApi } from '../api';
import { auditLink } from '../audit/auditLinks';
import { changedCount, finalEffect, groupByModule, isEffective, needsHolding, toRequest, toRows, withEdit, type DirectEffect, type Edits, type PermissionRow } from './permissionEffects';
import { PageHeader } from '@/components/common/PageHeader';
import { PageContainer } from '@/components/layout/PageContainer';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { ToneChip } from '@/components/common/StatusChip';
import { FormErrorAlert } from '@/components/forms/FormLayout';
import { UnsavedChangesGuard } from '@/components/forms/UnsavedChangesGuard';
import { useFormServerError } from '@/components/forms/useFormServerError';
import { useAuth } from '@/app/providers/authContext';
import { useApiMutation } from '@/hooks/useApiMutation';
import { PERMISSIONS } from '@/constants/permissions';
import type { S } from '@/types/api';

type Item = PermissionRow;
type Response = S<'UserPermissionsResponse'>;

const NO_FIELDS: string[] = [];
const toValue = (e: DirectEffect) => e ?? 'role';
const fromValue = (v: string): DirectEffect => (v === 'Grant' || v === 'Deny' ? v : null);

/** What the permission is right now: held or not, and why it stands out (a denial over a role, a direct grant). */
function EffectChips({ item, direct, held }: { item: Item; direct: DirectEffect; held: boolean }) {
  const { t } = useTranslation();
  const roles = item.roles;
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
      <ToneChip tone={held ? 'success' : 'neutral'} label={held ? t('userPermissions.held') : t('userPermissions.notHeld')} />
      {roles.length > 0 && direct === 'Deny' && <ToneChip tone="error" label={t('userPermissions.deniedDespiteRole')} />}
      {roles.length === 0 && direct === 'Grant' && <ToneChip tone="info" label={t('userPermissions.grantedDirectly')} />}
      {roles.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          {t('userPermissions.viaRoles', { roles: roles.join('، ') })}
        </Typography>
      )}
    </Stack>
  );
}

interface RowProps {
  item: Item;
  direct: DirectEffect;
  /** Stops editing (super admin, own account, or no right to manage permissions). */
  readOnly: boolean;
  /** Whether the editor holds this permission (needed to grant it or lift its denial). */
  editorHolds: boolean;
  onChange: (next: DirectEffect) => void;
}

function PermissionRow({ item, direct, readOnly, editorHolds, onChange }: RowProps) {
  const { t } = useTranslation();
  const disabledFor = (to: DirectEffect) => readOnly || (!editorHolds && needsHolding(item.direct, to));
  const options: { to: DirectEffect; label: string }[] = [
    { to: null, label: t('userPermissions.effect.role') },
    { to: 'Grant', label: t('userPermissions.effect.grant') },
    { to: 'Deny', label: t('userPermissions.effect.deny') },
  ];
  return (
    <Box sx={{ display: 'grid', gap: 1, py: 1, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" component="div">
          {item.name} {item.isSensitive && <ToneChip tone="error" label={t('roles.sensitive')} />}
        </Typography>
        {item.description && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.description}
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled" sx={{ direction: 'ltr', display: 'inline-block' }}>
          {item.code}
        </Typography>
        <EffectChips item={item} direct={direct} held={isEffective(item.roles.length > 0, direct)} />
        {!readOnly && !editorHolds && (
          <Typography variant="caption" color="warning.main" display="block">
            {t('userPermissions.notHeldByYou')}
          </Typography>
        )}
      </Box>
      <ToggleButtonGroup exclusive size="small" value={toValue(direct)} onChange={(_, v: string | null) => v !== null && onChange(fromValue(v))} aria-label={item.name}>
        {options.map((o) => (
          <ToggleButton key={o.label} value={toValue(o.to)} disabled={disabledFor(o.to)} color={o.to === 'Deny' ? 'error' : o.to === 'Grant' ? 'success' : 'standard'}>
            {o.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

interface ModuleProps {
  moduleName: string;
  rows: Item[];
  edits: Edits;
  readOnly: boolean;
  holds: (code: string) => boolean;
  onEdit: (item: Item, next: DirectEffect) => void;
}

function ModuleGroup({ moduleName, rows, edits, readOnly, holds, onEdit }: ModuleProps) {
  const direct = rows.filter((r) => finalEffect({ code: r.code, direct: r.direct }, edits) !== null).length;
  return (
    <Accordion disableGutters variant="outlined" defaultExpanded={direct > 0} sx={{ '&:before': { display: 'none' }, borderRadius: 2 }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1.5} sx={{ width: '100%', alignItems: 'center' }}>
          <Typography fontWeight={600} sx={{ flex: 1 }}>
            {moduleName}
          </Typography>
          {direct > 0 && <ToneChip tone="info" label={String(direct)} />}
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {rows.map((r) => (
          <PermissionRow key={r.code} item={r} direct={finalEffect({ code: r.code, direct: r.direct }, edits)} readOnly={readOnly} editorHolds={holds(r.code)} onChange={(next) => onEdit(r, next)} />
        ))}
      </AccordionDetails>
    </Accordion>
  );
}

/** Why the matrix cannot be edited, or `null` when it can (TL-N9). */
function useReadOnlyReason(data: Response): 'superAdmin' | 'self' | 'noRight' | null {
  const { user, can } = useAuth();
  if (data.isSuperAdmin) return 'superAdmin';
  if (user?.id === data.userId) return 'self';
  return can([PERMISSIONS.managePermissions]) ? null : 'noRight';
}

function PermissionsEditor({ data }: { data: Response }) {
  const { t } = useTranslation();
  const { can } = useAuth();
  const reason = useReadOnlyReason(data);
  const readOnly = reason !== null;
  const [edits, setEdits] = useState<Edits>({});
  const { serverError, handleServerError, clearServerError } = useFormServerError(() => undefined, NO_FIELDS);
  const rows = useMemo(() => toRows(data.permissions), [data.permissions]);
  const groups = useMemo(() => groupByModule(rows), [rows]);
  const save = useApiMutation((body: S<'SetUserPermissionsRequest'>) => usersApi.setPermissions(data.userId, body), {
    invalidate: [adminKeys.userPermissions(data.userId), adminKeys.users],
    rethrow: true,
    success: t('userPermissions.saved'),
    onSuccess: () => setEdits({}),
  });
  const changes = changedCount(edits);

  const submit = async () => {
    clearServerError();
    try {
      await save.mutateAsync(toRequest(rows, edits));
    } catch (e) {
      await handleServerError(e);
    }
  };

  return (
    <SectionCard
      title={t('userPermissions.matrix')}
      subheader={changes > 0 ? t('userPermissions.unsaved', { count: changes }) : undefined}
      action={
        !readOnly && (
          <Stack direction="row" spacing={1}>
            <Button size="small" color="inherit" disabled={changes === 0 || save.isPending} onClick={() => setEdits({})}>
              {t('common.discard')}
            </Button>
            <Button size="small" variant="contained" disabled={changes === 0 || save.isPending} onClick={() => void submit()}>
              {t('common.save')}
            </Button>
          </Stack>
        )
      }
    >
      <Stack spacing={1.5}>
        {reason && <Alert severity="info">{t(`userPermissions.readOnly.${reason}`)}</Alert>}
        <FormErrorAlert value={serverError} />
        {groups.map((g) => (
          <ModuleGroup
            key={g.module}
            moduleName={g.moduleName}
            rows={g.rows}
            edits={edits}
            readOnly={readOnly}
            holds={(code) => can([code])}
            onEdit={(item, next) => setEdits((current) => withEdit(current, { code: item.code, direct: item.direct }, next))}
          />
        ))}
      </Stack>
      <UnsavedChangesGuard when={changes > 0 && !save.isPending} />
    </SectionCard>
  );
}

/**
 * Direct permissions of one user (TL-N9): on top of the roles' permissions an administrator grants a
 * permission the roles do not give, or denies one they do; a denial beats every grant. Saving sends both
 * complete lists. The API refuses a change to one's own account, to a super admin, to a grant the editor
 * does not hold themselves, and to anyone without `Users.ManagePermissions`.
 */
export default function UserPermissionsPage() {
  const { t } = useTranslation();
  const id = Number(useParams().userId);
  const { can } = useAuth();
  const user = useQuery({ queryKey: [...adminKeys.users, 'detail', id], queryFn: () => usersApi.get(id) });
  const permissions = useQuery({ queryKey: adminKeys.userPermissions(id), queryFn: () => usersApi.permissions(id) });
  const name = user.data?.fullName ?? user.data?.userName ?? undefined;

  return (
    <PageContainer>
      <PageHeader
        title={t('userPermissions.title')}
        subtitle={name}
        breadcrumbs={[
          { label: t('nav.items.users'), to: '/admin/users' },
          { label: name ?? String(id), to: `/admin/users/${id}` },
        ]}
        actions={
          can([PERMISSIONS.auditView]) && (
            <Button component={RouterLink} to={auditLink({ EntityType: 'User', EntityId: String(id), ActionCodes: ['User.PermissionsChanged'], IncludeChanges: true })} startIcon={<HistoryOutlinedIcon />}>
              {t('userPermissions.history')}
            </Button>
          )
        }
      />
      <QueryBoundary query={permissions}>{(data) => <PermissionsEditor key={data.userId} data={data} />}</QueryBoundary>
    </PageContainer>
  );
}
