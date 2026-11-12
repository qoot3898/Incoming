import type { S } from '@/types/api';

/**
 * TL-N13: a staffing request can be submitted together with its candidates, chosen from the candidate list
 * (`candidateIds`) and/or entered new (`newCandidates`, recorded in the list and nominated in the same
 * transaction). This holds the form side of that: the shape of a new candidate's row, the request body and the
 * mapping of the API's validation keys (`errors["NewCandidates[1].NationalityId"]`) onto the rows.
 */

/** A new candidate as the form holds him: all text, the select values are ids written as strings. */
export interface NewCandidateRow {
  name: string;
  nationalityId: string;
  recruitedBy: string;
  phone: string;
  nominatedBy: string;
  notes: string;
}

export const EMPTY_NEW_CANDIDATE: NewCandidateRow = { name: '', nationalityId: '', recruitedBy: '', phone: '', nominatedBy: '', notes: '' };

export const NEW_CANDIDATE_FIELDS = ['name', 'nationalityId', 'recruitedBy', 'phone', 'nominatedBy', 'notes'] as const;

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

/** `candidateIds` of the request: the chosen list candidates, or `null` when none were chosen. */
export function toCandidateIds(chosen: readonly { id: number }[]): number[] | null {
  return chosen.length > 0 ? chosen.map((c) => c.id) : null;
}

/**
 * `newCandidates` of the request, each for the request's job (they are being nominated for it), or `null` when
 * there are none. Empty optional fields are sent as `null` rather than as empty text.
 */
export function toNewCandidates(rows: readonly NewCandidateRow[], jobId: number | null): S<'CandidateInput'>[] | null {
  if (rows.length === 0) return null;
  return rows.map((r) => ({
    name: r.name.trim(),
    nationalityId: Number(r.nationalityId),
    recruitedBy: r.recruitedBy as S<'LaborParty'>,
    phone: orNull(r.phone),
    nominatedBy: orNull(r.nominatedBy),
    jobId,
    notes: orNull(r.notes),
  }));
}

/** Server field names the rows can show (camelCased by the error mapper), e.g. `newCandidates[0].name`. */
export function newCandidateFieldNames(rowCount: number): string[] {
  return Array.from({ length: rowCount }, (_, i) => NEW_CANDIDATE_FIELDS.map((f) => `newCandidates[${i}].${f}`)).flat();
}

/** React Hook Form path of a server field: `newCandidates[1].name` → `newCandidates.1.name`. */
export function formPath(serverField: string): string {
  return serverField.replace(/\[(\d+)\]/g, '.$1');
}
