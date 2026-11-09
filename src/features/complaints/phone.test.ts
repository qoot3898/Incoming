import { describe, expect, it } from 'vitest';
import { normalizePhone, phoneProblem, toAsciiDigits } from './phone';

describe('complaint phone rule', () => {
  it('accepts separators and a leading plus, and stores digits only', () => {
    expect(phoneProblem('+218 91-234 5678')).toBeNull();
    expect(phoneProblem('(091) 234.5678')).toBeNull();
    expect(normalizePhone(' +218 91-234 5678 ')).toBe('+218912345678');
  });

  it('accepts Arabic-Indic digits', () => {
    expect(toAsciiDigits('٠٩١٢٣٤٥٦٧٨')).toBe('0912345678');
    expect(toAsciiDigits('۰۹۱۲')).toBe('0912');
    expect(phoneProblem('٠٩١-٢٣٤-٥٦٧٨')).toBeNull();
    expect(normalizePhone('+٢١٨ ٩١')).toBe('+21891');
  });

  it('rejects letters, a plus inside the number, and out-of-range lengths', () => {
    expect(phoneProblem('091abc4567')).toBe('characters');
    expect(phoneProblem('091+2345678')).toBe('characters');
    expect(phoneProblem('12345')).toBe('tooShort');
    expect(phoneProblem('1234567890123456')).toBe('tooLong');
  });
});
