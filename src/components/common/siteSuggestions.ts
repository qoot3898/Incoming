import type { SiteSuggestion } from '@/services/api/errors';

/** One reason a site is proposed (TL-N7); `value: null` means "no limit" / "unknown". */
export type SuggestionReason =
  | { kind: 'shortage'; value: number }
  | { kind: 'freePlaces'; value: number | null }
  | { kind: 'distance'; value: number | null };

/**
 * Why a site is suggested, in display order: the workers approved requests still lack there, the room
 * it has (`null` = no limit) and its distance from the requested site (`null` = unknown).
 */
export function suggestionReasons(s: SiteSuggestion): SuggestionReason[] {
  const reasons: SuggestionReason[] = [];
  if (s.shortage !== null && s.shortage > 0) reasons.push({ kind: 'shortage', value: s.shortage });
  reasons.push({ kind: 'freePlaces', value: s.freePlaces });
  reasons.push({ kind: 'distance', value: s.distanceKm });
  return reasons;
}

/** Distance with one decimal at most, e.g. `12.4`, `8`. */
export function formatKm(km: number): string {
  return String(Math.round(km * 10) / 10);
}
