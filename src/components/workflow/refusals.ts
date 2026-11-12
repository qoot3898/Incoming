import type { LaborParty } from '@/types/api';

export interface PartyRefusal {
  party: LaborParty;
  /** The API's reason the user may not decide for this party now; `null` when he may. */
  refusal?: string | null;
}

/** Parties refused for the same reason, with that reason as the API wrote it. */
export interface RefusalGroup {
  parties: LaborParty[];
  text: string;
}

/**
 * Splits the approval parties a user represents into those he may decide for now (`open`) and the refusals for
 * the others. Parties refused for the same reason share one group, so a user who represents all four parties of
 * the start chain reads one line naming them instead of four identical lines; different reasons stay separate.
 * Groups keep the order in which their first party appears.
 */
export function splitParties<T extends PartyRefusal>(parties: readonly T[]): { open: T[]; refused: RefusalGroup[] } {
  const open: T[] = [];
  const groups = new Map<string, LaborParty[]>();
  for (const p of parties) {
    if (!p.refusal) {
      open.push(p);
      continue;
    }
    groups.set(p.refusal, [...(groups.get(p.refusal) ?? []), p.party]);
  }
  return { open, refused: [...groups].map(([text, group]) => ({ parties: group, text })) };
}
