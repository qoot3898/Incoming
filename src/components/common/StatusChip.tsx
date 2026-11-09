import { Chip, type ChipProps } from '@mui/material';
import { useEnumLabel } from '@/hooks/useEnumLabel';
import type { Schemas } from '@/types/api';
import { brand } from '@/app/theme/brand';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

const TONES: Record<string, Tone> = {
  Approved: 'success', Active: 'success', Valid: 'success', Confirmed: 'success', Completed: 'success', Present: 'success',
  Accepted: 'success', Satisfactory: 'success', Acknowledged: 'success', Executed: 'success', Applied: 'success',
  Received: 'success', Done: 'success', Filled: 'success', Registered: 'primary', Excused: 'success', Success: 'success', Kept: 'primary',
  Rejected: 'error', NotApproved: 'error', NotAccepted: 'error', Unsatisfactory: 'error', Failed: 'error', Failure: 'error',
  Denied: 'error', Overdue: 'error', Dismissal: 'error', Suspended: 'error', AbsentWithoutPermission: 'error', Missing: 'error',
  Returned: 'warning', Due: 'warning', New: 'warning', Required: 'warning', Onboarding: 'info', Open: 'info', Interview: 'info', Reported: 'info', Collecting: 'info',
  Submitted: 'info', Reviewed: 'info', Delivered: 'info', Decided: 'info', Penalized: 'warning', HandedForTravel: 'warning',
  Cancelled: 'neutral', Closed: 'neutral', Terminated: 'neutral', Dismissed: 'neutral', NotRequired: 'neutral', HandedOnExit: 'neutral',
};

function toneOf(value: string): Tone {
  if (TONES[value]) return TONES[value];
  if (value.startsWith('Pending') || value.startsWith('Awaiting')) return 'warning';
  return 'neutral';
}

const STYLES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: '#E3F1E7', fg: '#1E6B3D' },
  warning: { bg: '#FBF0DC', fg: '#8A5300' },
  error: { bg: '#F8E3E1', fg: '#9A2019' },
  info: { bg: '#E3EEF5', fg: '#1F5F8B' },
  primary: { bg: brand.tealSoft, fg: brand.teal },
  neutral: { bg: '#EEEFEC', fg: '#4A5654' },
};

interface Props extends Omit<ChipProps, 'label' | 'color'> {
  enumName: keyof Schemas;
  value?: string | null;
}

export function StatusChip({ enumName, value, sx, ...rest }: Props) {
  const label = useEnumLabel();
  if (!value) return <>—</>;
  const s = STYLES[toneOf(value)];
  return <Chip size="small" label={label(enumName, value)} sx={{ bgcolor: s.bg, color: s.fg, ...sx }} {...rest} />;
}

export function ToneChip({ tone, label, ...rest }: { tone: Tone; label: string } & Omit<ChipProps, 'label' | 'color'>) {
  const s = STYLES[tone];
  return <Chip size="small" label={label} sx={{ bgcolor: s.bg, color: s.fg }} {...rest} />;
}
