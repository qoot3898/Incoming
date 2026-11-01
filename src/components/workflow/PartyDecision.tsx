import { Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ActionFormButton } from '@/components/forms/ActionFormButton';
import { RefusalHint } from '@/components/common/RefusalHint';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import type { FieldConfig } from '@/components/forms/FormDialog';
import type { LaborParty } from '@/types/api';

export type Verdict = 'Approve' | 'Return' | 'Reject';

interface Props {
  parties: { party: LaborParty; refusal?: string | null }[];
  /** Parties whose decision is recorded on their behalf (proxy name field), e.g. Supervisor (decision TL-4). */
  proxyParties?: LaborParty[];
  verdicts?: Verdict[];
  onDecide: (party: LaborParty, verdict: Verdict, note: string | null, proxyName: string | null) => Promise<unknown>;
}

interface Values {
  note: string | null;
  proxyName: string | null;
}

/** Approve / return / reject buttons for each approval party the current user represents. */
export function PartyDecision({ parties, proxyParties = [], verdicts = ['Approve', 'Return', 'Reject'], onDecide }: Props) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  const proxySet = new Set(proxyParties);
  const verdictSet = new Set(verdicts);
  return (
    <Stack spacing={1.5}>
      {parties.map(({ party, refusal }) => {
        if (refusal) return <RefusalHint key={party} text={`${label('LaborParty', party)}: ${refusal}`} />;
        const proxy = proxySet.has(party);
        const fields = (required: boolean, noteLabel: string): FieldConfig<Values>[] => [
          { name: 'note', kind: 'textarea', label: noteLabel, required, maxLength: 500 },
          { name: 'proxyName', kind: 'text', label: t('workflow.proxyName'), hidden: !proxy, helperText: t('workflow.proxyHint'), maxLength: 200 },
        ];
        return (
          <Stack key={party} direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {verdictSet.has('Approve') && (
              <ActionFormButton<Values>
                label={t('workflow.approveAs', { party: label('LaborParty', party) })}
                variant="contained"
                color="success"
                fields={fields(false, t('workflow.note'))}
                onSubmit={(v) => onDecide(party, 'Approve', v.note, v.proxyName)}
              />
            )}
            {verdictSet.has('Return') && (
              <ActionFormButton<Values>
                label={t('workflow.returnForCorrection')}
                color="warning"
                fields={fields(true, t('workflow.returnReason'))}
                onSubmit={(v) => onDecide(party, 'Return', v.note, v.proxyName)}
              />
            )}
            {verdictSet.has('Reject') && (
              <ActionFormButton<Values>
                label={t('workflow.reject')}
                color="error"
                destructive
                fields={fields(true, t('workflow.rejectReason'))}
                onSubmit={(v) => onDecide(party, 'Reject', v.note, v.proxyName)}
              />
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
