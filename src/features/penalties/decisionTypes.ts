import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminKeys, directoriesApi } from '@/features/admin/api';
import { BASE_PENALTY_DECISIONS, PENALTY_BEHAVIORS, PENALTY_DECISIONS_SLUG, type PenaltyBehavior } from '@/constants/directories';
import type { Option } from '@/components/forms/FormDialog';
import type { S } from '@/types/api';

type Entry = S<'DirectoryEntryItem'>;

/**
 * A punishment type as the API exchanges it: the enum name for the three base types, or the
 * type's number for any type (TL-N5: `{ "decision": 60 }`). Responses carry the same shapes.
 */
export type PenaltyDecisionValue = NonNullable<S<'PenaltyDecision'>> | number;

const NAME_TO_NUMBER = new Map(Object.entries(BASE_PENALTY_DECISIONS).map(([n, name]) => [name as string, Number(n)]));

/** Number of a decision value (`"Warning"` → 1, `60` / `"60"` → 60); `null` when absent. */
export function decisionNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  const s = String(value);
  if (/^\d+$/.test(s)) return Number(s);
  return NAME_TO_NUMBER.get(s) ?? null;
}

/** The value to send for a type number: base types by name (valid for every API version), others by number. */
export function decisionValue(number: number): PenaltyDecisionValue {
  return BASE_PENALTY_DECISIONS[number] ?? number;
}

export function behaviorOf(entry: Pick<Entry, 'number' | 'fields'> | undefined): PenaltyBehavior | undefined {
  if (!entry) return undefined;
  const b = entry.fields?.behavior;
  if (typeof b === 'string' && (PENALTY_BEHAVIORS as readonly string[]).includes(b)) return b as PenaltyBehavior;
  return BASE_PENALTY_DECISIONS[entry.number];
}

/**
 * Punishment types from `directories/labor-penalty-decisions` (readable with `TemporaryLabor.View`):
 * labels in the UI language (`name-en` field in English), select options and each type's behavior.
 * Falls back to the enum labels while the list loads or when it is unavailable.
 */
export function usePenaltyDecisionTypes() {
  const { t, i18n } = useTranslation();
  const q = useQuery({
    queryKey: [...adminKeys.directories, PENALTY_DECISIONS_SLUG, {}],
    queryFn: ({ signal }) => directoriesApi.list(PENALTY_DECISIONS_SLUG, {}, signal),
    staleTime: 10 * 60_000,
  });
  const english = i18n.language === 'en';

  return useMemo(() => {
    const entries = q.data?.entries ?? [];
    const byNumber = new Map(entries.map((e) => [e.number, e]));
    const nameOf = (e: Entry) => {
      const en = e.fields?.['name-en'];
      return (english && typeof en === 'string' && en.trim()) || e.name || String(e.number);
    };
    const label = (value: unknown): string => {
      const n = decisionNumber(value);
      if (n === null) return '—';
      const entry = byNumber.get(n);
      if (entry) return nameOf(entry);
      const base = BASE_PENALTY_DECISIONS[n];
      return base ? t(`enums.PenaltyDecision.${base}`) : String(value);
    };
    /** Select options keyed by type number; stopped types only when `includeInactive`. */
    const options = (includeInactive = false): Option[] => {
      if (entries.length === 0) {
        return Object.entries(BASE_PENALTY_DECISIONS).map(([n, name]) => ({ value: n, label: t(`enums.PenaltyDecision.${name}`) }));
      }
      return entries
        .filter((e) => includeInactive || e.isActive)
        .map((e) => ({ value: String(e.number), label: e.isActive ? nameOf(e) : `${nameOf(e)} (${t('directories.inactive')})` }));
    };
    const behavior = (value: unknown): PenaltyBehavior | undefined => {
      const n = decisionNumber(value);
      if (n === null) return undefined;
      return behaviorOf(byNumber.get(n)) ?? BASE_PENALTY_DECISIONS[n];
    };
    return { loading: q.isLoading, label, options, behavior };
  }, [q.data, q.isLoading, english, t]);
}
