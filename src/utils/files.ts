/** Scans accepted by the backend upload endpoints (PDF or image), see PROJECT_ANALYSIS U-13. */
export const DEFAULT_ACCEPT = 'application/pdf,image/*';

/**
 * Client-side guard only — the server's configured limit (FR-63) stays authoritative and its
 * validation message is shown when it is lower. 25 MB stays under the IIS/Kestrel default request
 * size (~28.6 MB) so oversized scans fail fast instead of after a long upload.
 */
export const DEFAULT_MAX_FILE_MB = 25;

export type FileProblem = { code: 'empty' } | { code: 'type' } | { code: 'size'; maxMb: number };

/** `accept` attribute semantics: `.ext`, `type/*` or an exact MIME type, comma separated. */
export function matchesAccept(file: Pick<File, 'name' | 'type'>, accept?: string): boolean {
  const tokens = (accept ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function validateFile(file: Pick<File, 'name' | 'type' | 'size'>, options: { accept?: string; maxMb?: number } = {}): FileProblem | null {
  if (file.size === 0) return { code: 'empty' };
  if (!matchesAccept(file, options.accept)) return { code: 'type' };
  if (options.maxMb && file.size > options.maxMb * 1024 * 1024) return { code: 'size', maxMb: options.maxMb };
  return null;
}

export function formatBytes(bytes: number, locale?: string): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)} ${units[unit]}`;
}

export type FileKind = 'image' | 'pdf' | 'other';

export function fileKind(file: Pick<File, 'name' | 'type'>): FileKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'other';
}
