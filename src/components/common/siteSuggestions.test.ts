import { describe, expect, it } from 'vitest';
import { formatKm, suggestionReasons } from './siteSuggestions';

const site = { workSiteId: 1, number: 101, name: 'Site', shortage: null, freePlaces: null, distanceKm: null };

describe('suggestionReasons (TL-N7)', () => {
  it('leads with the shortage of approved requests when there is one', () => {
    expect(suggestionReasons({ ...site, shortage: 3, distanceKm: 12.4 })).toEqual([
      { kind: 'shortage', value: 3 },
      { kind: 'freePlaces', value: null },
      { kind: 'distance', value: 12.4 },
    ]);
  });

  it('shows free places and an unknown distance for a site without a shortage', () => {
    expect(suggestionReasons({ ...site, freePlaces: 6 })).toEqual([
      { kind: 'freePlaces', value: 6 },
      { kind: 'distance', value: null },
    ]);
  });

  it('formats distances with at most one decimal', () => {
    expect(formatKm(12.44)).toBe('12.4');
    expect(formatKm(8)).toBe('8');
    expect(formatKm(7.96)).toBe('8');
  });
});
