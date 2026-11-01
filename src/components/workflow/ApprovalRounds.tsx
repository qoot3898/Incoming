import { Box, Chip, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import UndoIcon from '@mui/icons-material/Undo';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import BlockIcon from '@mui/icons-material/Block';
import { useTranslation } from 'react-i18next';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import { formatDateTime } from '@/utils/format';
import { EmptyState } from '@/components/common/States';
import { brand } from '@/app/theme/brand';
import type { ApprovalDecision, LaborParty } from '@/types/api';

export interface ApprovalStep {
  sequence?: number;
  party?: LaborParty;
  decision: ApprovalDecision;
  decidedBy?: string | null;
  decidedAt?: string | null;
  note?: string | null;
  proxyName?: string | null;
  label?: string;
}

export interface ApprovalRound {
  round: number;
  steps: ApprovalStep[];
}

const ICONS: Record<string, JSX.Element> = {
  Approved: <CheckCircleIcon sx={{ color: 'success.main' }} />,
  Rejected: <CancelIcon sx={{ color: 'error.main' }} />,
  Returned: <UndoIcon sx={{ color: 'warning.main' }} />,
  Cancelled: <BlockIcon sx={{ color: 'text.disabled' }} />,
  Pending: <RadioButtonUncheckedIcon sx={{ color: 'text.disabled' }} />,
};

/** Approval chain rendered as rounds of ordered steps (latest round first). */
export function ApprovalRounds({ rounds }: { rounds: ApprovalRound[] }) {
  const { t } = useTranslation();
  const label = useEnumLabel();
  if (!rounds.length) return <EmptyState title={t('workflow.noApprovals')} />;
  const sorted = [...rounds].sort((a, b) => b.round - a.round);
  return (
    <Stack spacing={2.5}>
      {sorted.map((r) => (
        <Box key={r.round}>
          {rounds.length > 1 && (
            <Chip size="small" label={t('workflow.round', { n: r.round })} sx={{ mb: 1.5 }} variant="outlined" />
          )}
          <Stack component="ol" spacing={0} sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {r.steps.map((s, i) => (
              <Box component="li" key={i} sx={{ display: 'flex', gap: 1.5, position: 'relative', pb: i === r.steps.length - 1 ? 0 : 2 }}>
                <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box sx={{ lineHeight: 0, zIndex: 1, bgcolor: 'background.paper' }}>{ICONS[s.decision] ?? ICONS.Pending}</Box>
                  {i < r.steps.length - 1 && <Box sx={{ flex: 1, width: '2px', bgcolor: 'divider', mt: 0.5 }} />}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={600}>
                      {s.label ?? (s.party ? label('LaborParty', s.party) : '')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {label('ApprovalDecision', s.decision)}
                    </Typography>
                  </Stack>
                  {(s.decidedBy || s.decidedAt) && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {[s.decidedBy, s.proxyName ? t('workflow.onBehalfOf', { name: s.proxyName }) : null, formatDateTime(s.decidedAt)]
                        .filter((x) => x && x !== '—')
                        .join(' · ')}
                    </Typography>
                  )}
                  {s.note && (
                    <Typography variant="body2" sx={{ mt: 0.5, p: 1, bgcolor: brand.creamSoft, borderRadius: 1.5 }}>
                      {s.note}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
