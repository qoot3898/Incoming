import { describe, expect, it } from 'vitest';
import { CAPACITY_MAX, capacityProblem, capacityState, overCapacityCount } from './capacity';

describe('capacityState (TL-N7)', () => {
  it('has no limit when the capacity is empty', () => {
    expect(capacityState({ capacity: null, occupancy: 40, overCapacity: 0 })).toBe('unlimited');
  });

  it('is available, full or over capacity by the occupancy', () => {
    expect(capacityState({ capacity: 10, occupancy: 9, overCapacity: 0 })).toBe('available');
    expect(capacityState({ capacity: 10, occupancy: 10, overCapacity: 0 })).toBe('full');
    expect(capacityState({ capacity: 10, occupancy: 12, overCapacity: 2 })).toBe('over');
  });
});

describe('capacityProblem', () => {
  it('accepts an empty field (no limit) when the site had a limit', () => {
    expect(capacityProblem(null, 10)).toBeNull();
  });

  it('accepts whole numbers from 0 to 10000', () => {
    expect(capacityProblem(0, 10)).toBeNull();
    expect(capacityProblem(CAPACITY_MAX, 10)).toBeNull();
  });

  it('rejects fractions and out-of-range values', () => {
    expect(capacityProblem(2.5, 10)).toBe('integer');
    expect(capacityProblem(-1, 10)).toBe('range');
    expect(capacityProblem(CAPACITY_MAX + 1, 10)).toBe('range');
  });

  it('rejects the current capacity again, limited or not', () => {
    expect(capacityProblem(10, 10)).toBe('unchanged');
    expect(capacityProblem(null, null)).toBe('unchanged');
  });
});

describe('overCapacityCount', () => {
  it('counts the sites whose capacity is below their occupancy', () => {
    expect(overCapacityCount([{ overCapacity: 0 }, { overCapacity: 2 }, { overCapacity: 1 }])).toBe(2);
    expect(overCapacityCount([])).toBe(0);
  });
});
