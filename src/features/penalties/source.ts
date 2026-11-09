import type { S } from '@/types/api';

/** Where a penalty came from (list filter `Source`, TL-N5): a direct proposal, an absence incident, or an evaluation review. */
export function penaltySource(r: Pick<S<'PenaltyListItem'>, 'fromAbsenceIncident' | 'fromEvaluation'>): NonNullable<S<'PenaltySource'>> {
  if (r.fromAbsenceIncident) return 'AbsenceIncident';
  if (r.fromEvaluation) return 'Evaluation';
  return 'Direct';
}
