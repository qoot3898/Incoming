import { useState } from 'react';
import { Alert, Box, Button, Grid2 as Grid, Stack } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { onboardingApi, onboardingKeys } from './api';
import { ChecklistCard, NoticeCard, PassportCard, SalaryCard, StartApprovalCard, StartRecordCard, SurveyCard, AttachmentsCard } from './OnboardingCards';
import { useOnboardingInvalidation } from './invalidation';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { StatusChip, ToneChip } from '@/components/common/StatusChip';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { FormDialog } from '@/components/forms/FormDialog';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useEnumLabel, useEnumOptions } from '@/hooks/useEnumLabel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ENUMS } from '@/constants/enums';
import { errorMessage, type ApiError } from '@/services/api/errors';
import { formatDate, todayIso } from '@/utils/format';
import type { S } from '@/types/api';

type Rec = S<'OnboardingRecord'>;

export default function OnboardingRecordPage() {
  const { t } = useTranslation();
  const employeeId = Number(useParams().employeeId);
  const query = useQuery({ queryKey: onboardingKeys.record(employeeId), queryFn: () => onboardingApi.record(employeeId) });

  return (
    <QueryBoundary query={query}>
      {(r) => (
        <Box>
          <PageHeader
            title={t('onboarding.recordTitle', { name: r.name })}
            subtitle={`${t('fields.employeeNumber')}: ${r.employeeNumber} · ${[r.jobName, r.trackName, r.workSiteName].filter(Boolean).join(' · ')}`}
            breadcrumbs={[
              { label: t('nav.items.onboarding'), to: '/onboarding' },
              { label: r.name ?? String(r.employeeNumber), to: `/workers/${r.employeeId}` },
            ]}
            meta={
              <Stack direction="row" spacing={1}>
                <StatusChip enumName="LaborStatus" value={r.fileStatus} />
                {r.onboarding && <StatusChip enumName="OnboardingStatus" value={r.onboarding.status} />}
                {r.documentsOverdue && <ToneChip tone="error" label={t('onboarding.overdue')} />}
              </Stack>
            }
            actions={<HeaderActions r={r} />}
          />
          {r.statusReason && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {r.statusReason}
            </Alert>
          )}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack spacing={3}>
                <StartRecordCard r={r} />
                <ChecklistCard r={r} />
                <PassportCard r={r} />
                <SurveyCard r={r} />
                <AttachmentsCard r={r} />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 5 }}>
              <Stack spacing={3}>
                <SalaryCard employeeId={r.employeeId} />
                <StartApprovalCard employeeId={r.employeeId} />
                <NoticeCard employeeId={r.employeeId} />
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}
    </QueryBoundary>
  );
}

function HeaderActions({ r }: { r: Rec }) {
  const { t } = useTranslation();
  const invalidate = useOnboardingInvalidation();
  const id = r.employeeId;
  const reportStart = useApiMutation((v: S<'ReportStartRequest'>) => onboardingApi.reportStart(id, v), { invalidate, rethrow: true });
  const open = useApiMutation((v: S<'OpenOnboardingRequest'>) => onboardingApi.open(id, v), { invalidate, rethrow: true });
  const correct = useApiMutation((v: S<'CorrectStartDateRequest'>) => onboardingApi.correctStartDate(id, v), { invalidate, rethrow: true });
  const closeNotStarted = useApiMutation((v: S<'CloseNotStartedRequest'>) => onboardingApi.closeNotStarted(id, v), { invalidate, rethrow: true });
  const [suspendOpen, setSuspendOpen] = useState(false);
  const reported = r.onboarding?.reportedStartDate ?? '';

  return (
    <>
      {r.canReportStart && (
        <ActionFormButton<S<'ReportStartRequest'>>
          label={t('onboarding.reportStart')}
          variant="contained"
          description={t('onboarding.reportStartHint')}
          fields={[
            { name: 'startDate', kind: 'date', label: t('onboarding.actualStartDate'), required: true, max: todayIso() },
            { name: 'reportedBy', kind: 'text', label: t('onboarding.reportedBy'), maxLength: 200 },
          ]}
          defaultValues={{ startDate: todayIso() }}
          onSubmit={(v) => reportStart.mutateAsync(v)}
        />
      )}
      {r.canWithdrawReport && <WithdrawReportButton employeeId={id} />}
      {r.canOpen && (
        <ActionFormButton<S<'OpenOnboardingRequest'>>
          label={t('onboarding.openRecord')}
          variant="contained"
          description={t('onboarding.openRecordHint', { date: formatDate(reported) })}
          fields={[
            { name: 'startDate', kind: 'date', label: t('onboarding.startDate'), required: true },
            { name: 'note', kind: 'textarea', label: t('onboarding.dateNote'), helperText: t('onboarding.dateNoteHint'), maxLength: 500 },
          ]}
          defaultValues={{ startDate: reported }}
          onSubmit={(v) => {
            if (v.startDate !== reported && !v.note) return Promise.reject({ title: t('onboarding.dateNoteRequired'), fieldErrors: { note: [t('validation.required')] } });
            return open.mutateAsync(v);
          }}
        />
      )}
      {r.canCorrectDate && (
        <ActionFormButton<S<'CorrectStartDateRequest'>>
          label={t('onboarding.correctDate')}
          fields={[
            { name: 'startDate', kind: 'date', label: t('onboarding.startDate'), required: true },
            { name: 'note', kind: 'textarea', label: t('onboarding.dateNote'), required: true, maxLength: 500 },
          ]}
          defaultValues={{ startDate: r.onboarding?.startDate ?? reported }}
          onSubmit={(v) => correct.mutateAsync(v)}
        />
      )}
      {r.canCloseNotStarted && (
        <ActionFormButton<S<'CloseNotStartedRequest'>>
          label={t('onboarding.closeNotStarted')}
          color="error"
          destructive
          description={t('onboarding.closeNotStartedHint')}
          fields={[
            { name: 'date', kind: 'date', label: t('common.date'), required: true },
            { name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 },
          ]}
          defaultValues={{ date: todayIso() }}
          onSubmit={(v) => closeNotStarted.mutateAsync(v)}
        />
      )}
      {r.canManage && (r.fileStatus === 'Onboarding' || r.fileStatus === 'Registered') && (
        <Button color="error" variant="outlined" onClick={() => setSuspendOpen(true)}>
          {t('suspension.suspend')}
        </Button>
      )}
      {r.onboarding && <PrintFormButton code="F04" recordId={r.employeeId} />}
      <Button component={RouterLink} to={`/workers/${r.employeeId}`} color="inherit">
        {t('workers.profile')}
      </Button>
      {suspendOpen && <SuspendDialog employeeId={id} onClose={() => setSuspendOpen(false)} />}
    </>
  );
}

/**
 * Withdraws the start report. While the worker has a termination request in progress the API refuses it
 * (422 `BUSINESS_RULE_VIOLATED`, TL-N10) and names the request; the refusal stays in the dialog until
 * the request is decided or cancelled.
 */
function WithdrawReportButton({ employeeId }: { employeeId: number }) {
  const { t } = useTranslation();
  const invalidate = useOnboardingInvalidation();
  const [open, setOpen] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const withdraw = useApiMutation(() => onboardingApi.withdrawStartReport(employeeId), { invalidate, rethrow: true });
  const close = () => {
    setOpen(false);
    setRefusal(null);
  };
  const confirm = async () => {
    setRefusal(null);
    try {
      await withdraw.mutateAsync();
      close();
    } catch (e) {
      if (!(e as ApiError).cancelled) setRefusal(errorMessage(e as ApiError));
    }
  };
  return (
    <>
      <Button color="inherit" variant="outlined" onClick={() => setOpen(true)}>
        {t('onboarding.withdrawReport')}
      </Button>
      <ConfirmDialog open={open} title={t('onboarding.withdrawReport')} message={t('onboarding.withdrawConfirm')} loading={withdraw.isPending} error={refusal} onClose={close} onConfirm={() => void confirm()} />
    </>
  );
}

function SuspendDialog({ employeeId, onClose }: { employeeId: number; onClose: () => void }) {
  const { t } = useTranslation();
  const enumOptions = useEnumOptions();
  const label = useEnumLabel();
  const invalidate = useOnboardingInvalidation();
  const sources = useQuery({ queryKey: [...onboardingKeys.all, 'suspension', employeeId], queryFn: () => onboardingApi.suspensionSources(employeeId) });
  const suspend = useApiMutation((v: Omit<S<'SuspensionInput'>, 'employeeId'>) => onboardingApi.suspend({ ...v, employeeId }), { invalidate, rethrow: true, success: t('suspension.done') });
  if (sources.isLoading) return null;
  const s = sources.data;
  const causes = ENUMS.SuspensionCause.filter((c) => (c === 'SurveyNotAccepted' ? s?.surveyNotAccepted : c === 'DocumentsOverdue' ? s?.documentsOverdue : true));
  return (
    <FormDialog<Omit<S<'SuspensionInput'>, 'employeeId'>>
      open
      onClose={onClose}
      title={t('suspension.suspend')}
      destructive
      description={
        <Stack spacing={1}>
          <span>{t('suspension.hint')}</span>
          {s?.refusal && <Alert severity="warning">{s.refusal}</Alert>}
          {s?.missingItems && s.missingItems.length > 0 && (
            <Alert severity="info">
              {t('suspension.missing')}: {s.missingItems.join('، ')} {s.documentsDueDate ? `(${t('onboarding.documentsDue')}: ${formatDate(s.documentsDueDate)})` : ''}
            </Alert>
          )}
          {s && <span>{t('fields.status')}: {label('LaborStatus', s.fileStatus)}</span>}
        </Stack>
      }
      fields={[
        { name: 'date', kind: 'date', label: t('common.date'), required: true, half: true },
        { name: 'cause', kind: 'select', label: t('suspension.cause'), required: true, half: true, options: enumOptions('SuspensionCause', causes) },
        { name: 'details', kind: 'textarea', label: t('suspension.details'), required: true, maxLength: 1000 },
      ]}
      defaultValues={{ date: todayIso() }}
      submitLabel={t('suspension.suspend')}
      onSubmit={(v) => suspend.mutateAsync(v)}
    />
  );
}
