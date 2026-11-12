import { describe, expect, it } from 'vitest';
import { leaversProblem, leavingEmployeeIds, parseCount } from './leavers';

describe('leaversProblem (TL-N8)', () => {
  it('needs nobody for a need request, whatever the count', () => {
    expect(leaversProblem('CurrentNeed', 3, [])).toBeNull();
    expect(leaversProblem('NewSite', 2, [1])).toBeNull();
  });

  it('asks for leaving workers on a replacement', () => {
    expect(leaversProblem('Replacement', 1, [])).toBe('required');
  });

  it('requires exactly one leaving worker per requested place', () => {
    expect(leaversProblem('Replacement', 2, [418])).toBe('count');
    expect(leaversProblem('Replacement', 1, [418, 422])).toBe('count');
    expect(leaversProblem('Replacement', 2, [418, 422])).toBeNull();
    expect(leaversProblem('Replacement', 1, [418])).toBeNull();
  });

  it('leaves an invalid count to the count field', () => {
    expect(leaversProblem('Replacement', Number.NaN, [418])).toBeNull();
    expect(leaversProblem('Replacement', 0, [418])).toBeNull();
  });
});

describe('leavingEmployeeIds', () => {
  it('sends the chosen ids in order for a replacement and null otherwise', () => {
    const picked = [{ employeeId: 418 }, { employeeId: 422 }];
    expect(leavingEmployeeIds('Replacement', picked)).toEqual([418, 422]);
    expect(leavingEmployeeIds('CurrentNeed', picked)).toBeNull();
  });
});

describe('parseCount', () => {
  it('reads the count typed into the number field, which arrives as text', () => {
    expect(parseCount('2')).toBe(2);
    expect(parseCount(3)).toBe(3);
  });

  it('is undefined until the field holds a whole number from 1', () => {
    for (const bad of ['', null, undefined, '0', '-1', '1.5', 'abc']) expect(parseCount(bad)).toBeUndefined();
  });
});
