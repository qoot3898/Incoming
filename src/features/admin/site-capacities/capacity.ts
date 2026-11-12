/** Rules of a work site's capacity (TL-N7), mirrored from the API so mistakes show before sending. */
export const CAPACITY_MIN = 0;
export const CAPACITY_MAX = 10000;

export type CapacityState = 'unlimited' | 'available' | 'full' | 'over';

interface Occupancy {
  capacity: number | null;
  occupancy: number;
  overCapacity: number;
}

/**
 * Where a site stands: no limit, room left, exactly full, or over capacity (the capacity was lowered
 * under the occupancy: nobody is moved, and every new placement is refused until it drops below).
 */
export function capacityState(site: Occupancy): CapacityState {
  if (site.capacity === null) return 'unlimited';
  if (site.overCapacity > 0) return 'over';
  return site.occupancy >= site.capacity ? 'full' : 'available';
}

export type CapacityProblem = 'integer' | 'range' | 'unchanged';

/**
 * Checks a capacity before it is sent. `null` (an empty field) means "no limit". The API refuses a
 * non-integer, a value outside 0–10000, and the current capacity again ("nothing changed").
 */
export function capacityProblem(next: number | null, current: number | null): CapacityProblem | null {
  if (next !== null) {
    if (!Number.isInteger(next)) return 'integer';
    if (next < CAPACITY_MIN || next > CAPACITY_MAX) return 'range';
  }
  return next === current ? 'unchanged' : null;
}

/** Sites currently over their capacity, for the warning above the list. */
export function overCapacityCount(sites: readonly Pick<Occupancy, 'overCapacity'>[]): number {
  return sites.filter((s) => s.overCapacity > 0).length;
}
