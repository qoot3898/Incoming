import { describe, expect, it } from 'vitest';
import { coordinateProblem, coordinateProblems, normalizeCoordinate } from './coordinates';

const FIELDS = [
  { key: 'name-en', kind: 'Text' as const },
  { key: 'latitude', kind: 'Latitude' as const },
  { key: 'longitude', kind: 'Longitude' as const },
];

describe('coordinateProblem (TL-N7)', () => {
  it('accepts empty values and numbers with up to six decimals inside the range', () => {
    expect(coordinateProblem('Latitude', '')).toBeNull();
    expect(coordinateProblem('Latitude', '32.887209')).toBeNull();
    expect(coordinateProblem('Longitude', '-180')).toBeNull();
    expect(coordinateProblem('Latitude', '90')).toBeNull();
  });

  it('rejects text, signs, exponents and too many decimals', () => {
    for (const bad of ['abc', '+32.1', '1e3', '32.1234567', '32.', '.5', '1,2,3']) expect(coordinateProblem('Latitude', bad)).toBe('format');
  });

  it('rejects values outside -90…90 and -180…180', () => {
    expect(coordinateProblem('Latitude', '90.000001')).toBe('range');
    expect(coordinateProblem('Latitude', '-91')).toBe('range');
    expect(coordinateProblem('Longitude', '180.5')).toBe('range');
    expect(coordinateProblem('Longitude', '120')).toBeNull();
  });

  it('reads Arabic-Indic digits and the Arabic decimal mark', () => {
    expect(normalizeCoordinate(' ٣٢٫٨٨٧٢٠٩ ')).toBe('32.887209');
    expect(normalizeCoordinate('13,144')).toBe('13.144');
    expect(coordinateProblem('Latitude', '٣٢٫٨٨٧٢٠٩')).toBeNull();
  });
});

describe('coordinateProblems', () => {
  it('is empty when both are valid or both are empty', () => {
    expect(coordinateProblems(FIELDS, { latitude: '32.669', longitude: '13.144' })).toEqual({});
    expect(coordinateProblems(FIELDS, { latitude: '', longitude: null })).toEqual({});
  });

  it('asks for the missing half of the pair', () => {
    expect(coordinateProblems(FIELDS, { latitude: '32.669', longitude: '' })).toEqual({ longitude: 'pair' });
    expect(coordinateProblems(FIELDS, { latitude: '', longitude: '13.1' })).toEqual({ latitude: 'pair' });
  });

  it('reports a bad value and the missing pair half together', () => {
    expect(coordinateProblems(FIELDS, { latitude: '95', longitude: '' })).toEqual({ latitude: 'range', longitude: 'pair' });
  });

  it('ignores lists without coordinates', () => {
    expect(coordinateProblems([{ key: 'name-en', kind: 'Text' }], { 'name-en': 'x' })).toEqual({});
  });
});
