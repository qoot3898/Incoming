import i18n from '@/i18n';

const locale = () => (i18n.language === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB');

/**
 * `Intl` formatters are expensive to construct and these helpers run once per grid cell,
 * so instances are cached per locale + options.
 */
const formatterCache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

export function dateTimeFormat(options: Intl.DateTimeFormatOptions, lang: string = locale()): Intl.DateTimeFormat {
  const key = `d|${lang}|${JSON.stringify(options)}`;
  let f = formatterCache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) {
    f = new Intl.DateTimeFormat(lang, options);
    formatterCache.set(key, f);
  }
  return f;
}

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const lang = locale();
  const key = `n|${lang}|${JSON.stringify(options)}`;
  let f = formatterCache.get(key) as Intl.NumberFormat | undefined;
  if (!f) {
    f = new Intl.NumberFormat(lang, options);
    formatterCache.set(key, f);
  }
  return f;
}

const DATE_OPTS: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = { ...DATE_OPTS, hour: '2-digit', minute: '2-digit' };
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Parses `YYYY-MM-DD` as a local calendar date (no timezone shift). */
function parse(value: string): Date {
  if (ISO_DAY.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = parse(value);
  if (Number.isNaN(d.getTime())) return value;
  return dateTimeFormat(DATE_OPTS).format(d);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return dateTimeFormat(DATE_TIME_OPTS).format(d);
}

export function formatNumber(value?: number | null, fractionDigits = 0): string {
  if (value === null || value === undefined) return '—';
  return numberFormat({ minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value);
}

export const formatMoney = (value?: number | null) => formatNumber(value, 2);

export function formatBytes(size?: number | null): string {
  if (!size && size !== 0) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/** Today as `YYYY-MM-DD` in local time. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const dash = (v?: string | number | null) => (v === null || v === undefined || v === '' ? '—' : String(v));
