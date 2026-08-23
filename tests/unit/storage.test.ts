import { describe, it, expect } from 'vitest';

import { validateFile, formatBytes, pathFor, MAX_FILE_BYTES, ALLOWED_MIME } from '@/services/storage';

function fakeFile(size: number, type: string, name = 'x.pdf'): File {
  const parts = [new Uint8Array(size)];
  return new File(parts, name, { type });
}

describe('validateFile', () => {
  it('accepts a small PDF', () => {
    expect(validateFile(fakeFile(1024, 'application/pdf'))).toEqual({ ok: true });
  });

  it('rejects a file larger than 25 MB', () => {
    const oversize = MAX_FILE_BYTES + 1;
    expect(validateFile(fakeFile(oversize, 'application/pdf'))).toEqual({ ok: false, reason: 'size' });
  });

  it('rejects an unsupported MIME type', () => {
    expect(validateFile(fakeFile(1024, 'application/x-shockwave-flash'))).toEqual({
      ok: false,
      reason: 'type',
    });
  });

  it('accepts every declared MIME type', () => {
    for (const mime of ALLOWED_MIME) {
      expect(validateFile(fakeFile(1024, mime))).toEqual({ ok: true });
    }
  });
});

describe('formatBytes', () => {
  it('reports 12 as bytes', () => {
    expect(formatBytes(12)).toBe('12 B');
  });
  it('reports 2048 as KB with one decimal', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });
  it('reports 1_500_000 as MB with one decimal', () => {
    expect(formatBytes(1_500_000)).toBe('1.4 MB');
  });
});

describe('pathFor', () => {
  it('sanitizes weird characters in the file name', () => {
    const path = pathFor('proj', 'sub', 'name with spaces & symbols!.pdf');
    expect(path).toBe('proj/sub/name_with_spaces_symbols_.pdf');
  });
});
