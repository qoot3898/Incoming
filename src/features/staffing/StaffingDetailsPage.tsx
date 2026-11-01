import { useState } from 'react';
import { Box, Grid2 as Grid, Stack, Tab, Tabs } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { staffingApi, staffingKeys } from './api';
import { CandidatesPanel } from './CandidatesPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryBoundary } from '@/components/common/States';
import { SectionCard } from '@/components/common/SectionCard';
import { InfoGrid } from '@/components/common/InfoGrid';
import { StatusChip } from '@/components/common/StatusChip';
import { RefusalHint } from '@/components/common/RefusalHint';
import { PrintFormButton } from '@/components/common/FileButtons';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { ApprovalRounds, type ApprovalRound } from '@/components/workflow/ApprovalRounds';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDate, formatDateTime } from '@/utils/format';
import type { LaborParty, S } from '@/types/api';

type Details = S<'StaffingRequestDetails'>;

function groupRounds(items: S<'StaffingApprovalItem'>[]): ApprovalRound[] {
  const map = new Map<number, ApprovalRound>();
  items.forEach((a) => {
    const r = map.get(a.round) ?? { round: a.round, steps: [] };
    r.steps.push(a);
    map.set(a.round, r);
  });
  return [...map.values()].map((r) => ({ ...r, steps: r.steps.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)) }));
}

export default function StaffingDetailsPage() {
  const { t } = useTranslation();
  const number = Number(useParams().number);
  const query = useQuery({ queryKey: staffingKeys.detail(number), queryFn: () => staffingApi.get(number) });
  const [tab, setTab] = useState(0);

  return (
    <QueryBoundary query={query}>
      {(d) => (
        <Box>
          <PageHeader
            title={t('staffing.requestNo', { n: d.number })}
            subtitle={[d.jobName, d.trackName, d.workSiteName].filter(Boolean).join(' · ')}
            breadcrumbs={[{ label: t('nav.items.staffing'), to: '/staffing-requests' }]}
            meta={<StatusChip enumName="StaffingRequestStatus" value={d.status} />}
            actions={<Actions d={d} />}
          />
          <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tab label={t('staffing.tabs.details')} />
            <Tab label={`${t('staffing.tabs.candidates')} (${d.approvedCount}/${d.count})`} />
          </Tabs>
          {tab === 0 ? <DetailsTab d={d} /> : <CandidatesPanel requestNumber={d.number} />}
        </Box>
      )}
    </QueryBoundary>
  );
}

function DetailsTab({ d }: { d: Details }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={3}>
          <SectionCard title={t('staffing.requestData')}>
            <InfoGrid
              columns={2}
              items={[
                { label: t('fields.track'), value: d.trackName },
                { label: t('fields.workSite'), value: d.workSiteName },
                { label: t('fields.job'), value: d.jobName },
                { label: t('staffing.countApproved'), value: `${d.approvedCount} / ${d.count}` },
                { label: t('staffing.reason'), value: label('StaffingReason', d.reason) },
                {
                  label: t('staffing.leavingWorker'),
                  value: d.leavingEmployeeNumber ? `${d.leavingEmployeeNumber} — ${d.leavingEmployeeName ?? ''}` : '—',
                  hidden: d.reason !== 'Replacement',
                },
                { label: t('staffing.requiredStartDate'), value: formatDate(d.requiredStartDate) },
                { label: t('staffing.requestedBy'), value: d.requestedBy },
                { label: t('staffing.enteredBy'), value: d.enteredBy },
                { label: t('common.createdAt'), value: formatDateTime(d.createdAt) },
                { label: t('staffing.unregistered'), value: d.unregisteredCandidates },
                { label: t('staffing.justification'), value: d.justification, span: 2 },
                { label: t('common.statusReason'), value: d.statusReason, span: 2, hidden: !d.statusReason },
              ]}
            />
          </SectionCard>
          <RefusalHint text={d.blockedReason} />
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <SectionCard title={t('workflow.approvals')}>
          <ApprovalRounds rounds={groupRounds(d.approvals)} />
        </SectionCard>
      </Grid>
    </Grid>
  );
}

function Actions({ d }: { d: Details }) {
  const { t } = useTranslation();
  const invalidate = [staffingKeys.all];
  const decide = useApiMutation((v: { party: LaborParty; approve: boolean; note: string | null }) => staffingApi.decide(d.number, { number: d.number, ...v }), { invalidate, rethrow: true });
  const close = useApiMutation((v: S<'CloseStaffingRequestRequest'>) => staffingApi.close(d.number, v), { invalidate, rethrow: true });

  const decisionButtons = (party: LaborParty) => (
    <>
      <ActionFormButton<{ note: string | null }>
        label={t('workflow.approveAs', { party: t(`enums.LaborParty.${party}`) })}
        variant="contained"
        color="success"
        fields={[{ name: 'note', kind: 'textarea', label: t('workflow.note'), maxLength: 500 }]}
        onSubmit={(v) => decide.mutateAsync({ party, approve: true, note: v.note })}
      />
      <ActionFormButton<{ note: string | null }>
        label={t('workflow.reject')}
        color="error"
        description={t('staffing.rejectHint')}
        destructive
        fields={[{ name: 'note', kind: 'textarea', label: t('workflow.rejectReason'), required: true, maxLength: 500 }]}
        onSubmit={(v) => decide.mutateAsync({ party, approve: false, note: v.note })}
      />
    </>
  );

  return (
    <>
      {d.canDecideAsOperations && decisionButtons('Operations')}
      {d.canDecideAsGeneralManager && decisionButtons('GeneralManager')}
      {d.canClose && (
        <ActionFormButton<S<'CloseStaffingRequestRequest'>>
          label={t('staffing.close')}
          color="inherit"
          description={t('staffing.closeHint')}
          fields={[{ name: 'reason', kind: 'textarea', label: t('common.reason'), required: true, maxLength: 500 }]}
          onSubmit={(v) => close.mutateAsync(v)}
        />
      )}
      <PrintFormButton code="F01" recordId={d.number} />
    </>
  );
}
