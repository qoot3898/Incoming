import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCEPT, fileKind, formatBytes, matchesAccept, validateFile } from './files';

const f = (name: string, type: string, size = 10) => ({ name, type, size });

describe('file validation', () => {
  it('matches accept tokens by MIME type, wildcard and extension', () => {
    expect(matchesAccept(f('a.pdf', 'application/pdf'), DEFAULT_ACCEPT)).toBe(true);
    expect(matchesAccept(f('a.jpg', 'image/jpeg'), DEFAULT_ACCEPT)).toBe(true);
    expect(matchesAccept(f('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'), DEFAULT_ACCEPT)).toBe(false);
    expect(matchesAccept(f('rows.CSV', ''), '.csv,text/csv')).toBe(true);
    expect(matchesAccept(f('x.bin', 'application/octet-stream'), '')).toBe(true);
  });

  it('reports empty, wrong type and oversized files', () => {
    expect(validateFile(f('a.pdf', 'application/pdf', 0))).toEqual({ code: 'empty' });
    expect(validateFile(f('a.exe', 'application/x-msdownload'), { accept: DEFAULT_ACCEPT })).toEqual({ code: 'type' });
    expect(validateFile(f('a.pdf', 'application/pdf', 3 * 1024 * 1024), { accept: DEFAULT_ACCEPT, maxMb: 2 })).toEqual({ code: 'size', maxMb: 2 });
    expect(validateFile(f('a.pdf', 'application/pdf', 1024), { accept: DEFAULT_ACCEPT, maxMb: 2 })).toBeNull();
  });

  it('formats sizes and classifies previewable files', () => {
    expect(formatBytes(512, 'en')).toBe('512 B');
    expect(formatBytes(1536, 'en')).toBe('1.5 KB');
    expect(formatBytes(25 * 1024 * 1024, 'en')).toBe('25 MB');
    expect(fileKind(f('scan.PDF', ''))).toBe('pdf');
    expect(fileKind(f('p.png', 'image/png'))).toBe('image');
    expect(fileKind(f('x.zip', 'application/zip'))).toBe('other');
  });
});
