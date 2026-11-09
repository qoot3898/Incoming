/**
 * Complainant phone rule of the public complaint form (TL-N1), mirrored from the API so mistakes
 * show before sending: 7–15 digits, an optional leading `+`, and spaces, dashes, parentheses or dots
 * between them. Arabic-Indic digits (٠-٩, ۰-۹) are accepted. The API stores digits only.
 */
export const PHONE_MIN_DIGITS = 7;
export const PHONE_MAX_DIGITS = 15;

const ARABIC_INDIC = /[٠-٩۰-۹]/g;
const ALLOWED = /^\+?[0-9\s\-().]+$/;

/** Converts Arabic-Indic and Persian digits to ASCII digits. */
export function toAsciiDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

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
