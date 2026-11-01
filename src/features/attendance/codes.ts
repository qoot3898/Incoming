import type { S } from '@/types/api';

export type Code = NonNullable<S<'AttendanceCode'>>;

/** Codes a user can enter (ApprovedLeave is filled automatically from approved leaves, FR-33). */
export const ENTERABLE: Code[] = ['Present', 'AbsentWithoutPermission', 'ExcusedAbsence', 'Rest'];

export const CODE_COLORS: Record<Code, { bg: string; fg: string }> = {
  Present: { bg: '#E3F1E7', fg: '#1E6B3D' },
  AbsentWithoutPermission: { bg: '#F8E3E1', fg: '#9A2019' },
  ApprovedLeave: { bg: '#E3EEF5', fg: '#1F5F8B' },
  ExcusedAbsence: { bg: '#FBF0DC', fg: '#8A5300' },
  Rest: { bg: '#EEEFEC', fg: '#4A5654' },
};

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
