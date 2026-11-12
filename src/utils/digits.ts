const ARABIC_INDIC = /[٠-٩۰-۹]/g;

/** Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to ASCII digits. */
export function toAsciiDigits(value: string): string {
  return value.replace(ARABIC_INDIC, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}
