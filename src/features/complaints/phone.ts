/**
 * Complainant phone rule of the public complaint form (TL-N1), mirrored from the API so mistakes
 * show before sending: 7–15 digits, an optional leading `+`, and spaces, dashes, parentheses or dots
 * between them. Arabic-Indic digits (٠-٩, ۰-۹) are accepted. The API stores digits only.
 */
import { toAsciiDigits } from '@/utils/digits';

export { toAsciiDigits };

export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;

const ALLOWED = /^\+?[0-9\s\-().]+$/;

export type PhoneProblem = 'characters' | 'tooShort' | 'tooLong';

export function phoneProblem(raw: string): PhoneProblem | null {
  const value = toAsciiDigits(raw.trim());
  if (!ALLOWED.test(value)) return 'characters';
  const digits = value.replace(/\D/g, '').length;
  if (digits < PHONE_MIN_DIGITS) return 'tooShort';
  if (digits > PHONE_MAX_DIGITS) return 'tooLong';
  return null;
}

/** The stored form: digits with the optional leading `+` (e.g. `+218912345678`). */
export function normalizePhone(raw: string): string {
  const value = toAsciiDigits(raw.trim());
  return (value.startsWith('+') ? '+' : '') + value.replace(/\D/g, '');
}
