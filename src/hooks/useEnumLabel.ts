import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Schemas } from '@/types/api';

/** Translates backend enum values: `label('LaborStatus', 'Active')`. */
export function useEnumLabel() {
  const { t } = useTranslation();
  return useCallback(
    (enumName: keyof Schemas, value?: string | null) =>
      value === null || value === undefined || value === '' ? '—' : t(`enums.${enumName}.${value}`, { defaultValue: value }),
    [t],
  );
}

/** Options for a select built from enum values. */
export function useEnumOptions() {
  const label = useEnumLabel();
  return useCallback(
    <T extends string>(enumName: keyof Schemas, values: readonly T[]) =>
      values.map((value) => ({ value, label: label(enumName, value) })),
    [label],
  );
}
