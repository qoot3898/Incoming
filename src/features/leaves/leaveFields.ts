import type { TFunction } from 'i18next';
import type { FieldConfig, Option } from '@/components/forms/FormDialog';
import type { S } from '@/types/api';

export function leaveFields(t: TFunction, typeOptions: Option[]): FieldConfig<S<'LeaveRequest'>>[] {
  return [
    { name: 'type', kind: 'select', label: t('leaves.type'), required: true, options: typeOptions },
    { name: 'fromDate', kind: 'date', label: t('common.from'), required: true, half: true },
    { name: 'toDate', kind: 'date', label: t('common.to'), required: true, half: true, helperText: t('leaves.inclusiveHint') },
    { name: 'requiresTravel', kind: 'boolean', label: t('leaves.requiresTravel') },
    { name: 'notes', kind: 'textarea', label: t('common.notes'), maxLength: 1000 },
  ];
}

/** Inclusive day count between two ISO dates (display only; the backend computes the official value). */
export function inclusiveDays(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const d = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return d > 0 ? d : null;
}
