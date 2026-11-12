import { toAsciiDigits } from '@/utils/digits';
import type { S } from '@/types/api';

/**
 * Work-site coordinates (TL-N7), entered in the `work-sites` list as two extra fields typed `Latitude`
 * and `Longitude`: -90…90 and -180…180, at most six decimals, sent as text in Latin digits
 * (`"32.887209"`). Both are entered or both left empty; a site without coordinates is skipped when
 * suggested sites are ordered by distance.
 */
export type CoordinateKind = Extract<S<'DirectoryFieldKind'>, 'Latitude' | 'Longitude'>;

export const COORDINATE_LIMIT: Record<CoordinateKind, number> = { Latitude: 90, Longitude: 180 };
export const COORDINATE_MAX_DECIMALS = 6;
/** `-180.123456` is the longest valid text. */
export const COORDINATE_MAX_LENGTH = 11;

export type CoordinateProblem = 'format' | 'range';

export const isCoordinateKind = (kind: S<'DirectoryFieldKind'> | undefined): kind is CoordinateKind => kind === 'Latitude' || kind === 'Longitude';

/** The stored text: Arabic-Indic digits and the Arabic decimal mark (٫) or a comma become a plain `.`. */
export function normalizeCoordinate(raw: string): string {
  return toAsciiDigits(raw.trim()).replace(/[٫,]/g, '.');
}

const FORMAT = new RegExp(`^-?\\d+(\\.\\d{1,${COORDINATE_MAX_DECIMALS}})?$`);

/** What is wrong with a typed coordinate, or `null` when it is empty or valid. */
export function coordinateProblem(kind: CoordinateKind, raw: string): CoordinateProblem | null {
  const value = normalizeCoordinate(raw);
  if (value === '') return null;
  if (!FORMAT.test(value)) return 'format';
  return Math.abs(Number(value)) > COORDINATE_LIMIT[kind] ? 'range' : null;
}

export type CoordinateFieldProblem = CoordinateProblem | 'pair';

/**
 * Problems of a site entry's coordinate fields, by field key: each value against its range, and the
 * pair rule (latitude and longitude together or neither).
 */
export function coordinateProblems(
  fields: readonly { key?: string | null; kind: S<'DirectoryFieldKind'> }[],
  values: Record<string, unknown>,
): Record<string, CoordinateFieldProblem> {
  const out: Record<string, CoordinateFieldProblem> = {};
  const coords = fields.flatMap((f) => (isCoordinateKind(f.kind) && f.key ? [{ key: f.key, kind: f.kind, text: typeof values[f.key] === 'string' ? (values[f.key] as string) : '' }] : []));
  coords.forEach(({ key, kind, text }) => {
    const problem = coordinateProblem(kind, text);
    if (problem) out[key] = problem;
  });
  const filled = coords.filter((c) => c.text.trim() !== '');
  if (filled.length > 0 && filled.length < coords.length) {
    coords.filter((c) => c.text.trim() === '').forEach((c) => (out[c.key] = 'pair'));
  }
  return out;
}
