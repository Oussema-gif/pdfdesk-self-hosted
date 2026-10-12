import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPdf } from './loadPdf';
import {
  EncryptedPdfError,
  FileTooLargeError,
  MalformedPdfError,
  NotAPdfError,
  TooManyPagesError,
} from './errors';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../../tests/fixtures');

function fixtureFile(name: string, type = 'application/pdf'): File {
  const buf = readFileSync(resolve(FIXTURES, name));
  return new File([buf], name, { type });
}

const LIMITS = { maxFileSizeMb: 50, maxPages: 500 };

beforeAll(() => {
  if (!existsSync(FIXTURES)) {
    throw new Error(
      `Fixtures missing at ${FIXTURES}. From frontend/ run: node scripts/generate-fixtures.mjs`,
    );
  }
});

describe('loadPdf', () => {
  it('loads a valid single-page PDF', async () => {
    const loaded = await loadPdf(fixtureFile('normal.pdf'), { limits: LIMITS });
    expect(loaded.pageCount).toBe(1);
    expect(loaded.fileName).toBe('normal.pdf');
    expect(loaded.byteLength).toBeGreaterThan(0);
    expect(loaded.bytes).toBeInstanceOf(Uint8Array);
  });

  it('loads a multi-page PDF', async () => {
    const loaded = await loadPdf(fixtureFile('multi-page.pdf'), { limits: LIMITS });
    expect(loaded.pageCount).toBe(5);
  });

  it('accepts a caller-supplied fileId', async () => {
    const loaded = await loadPdf(fixtureFile('normal.pdf'), { limits: LIMITS, fileId: 'custom' });
    expect(loaded.fileId).toBe('custom');
  });

  it('rejects bytes that do not start with %PDF-', async () => {
    const notPdf = new File([new Uint8Array([1, 2, 3, 4, 5, 6])], 'fake.pdf', {
      type: 'application/pdf',
    });
    await expect(loadPdf(notPdf, { limits: LIMITS })).rejects.toBeInstanceOf(NotAPdfError);
  });

  it('rejects a JPG misnamed as PDF', async () => {
    const buf = readFileSync(resolve(FIXTURES, 'sample.jpg'));
    const file = new File([buf], 'actually-a-jpeg.pdf', { type: 'application/pdf' });
    await expect(loadPdf(file, { limits: LIMITS })).rejects.toBeInstanceOf(NotAPdfError);
  });

  it('rejects encrypted PDFs with EncryptedPdfError', async () => {
    if (!existsSync(resolve(FIXTURES, 'encrypted.pdf'))) return;
    await expect(loadPdf(fixtureFile('encrypted.pdf'), { limits: LIMITS })).rejects.toBeInstanceOf(
      EncryptedPdfError,
    );
  });

  it('rejects corrupted PDFs with MalformedPdfError', async () => {
    await expect(loadPdf(fixtureFile('corrupted.pdf'), { limits: LIMITS })).rejects.toBeInstanceOf(
      MalformedPdfError,
    );
  });

  it('enforces the file-size limit before parsing', async () => {
    await expect(
      loadPdf(fixtureFile('normal.pdf'), { limits: { maxFileSizeMb: 0.0000001, maxPages: 500 } }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
  });

  it('enforces the page-count limit', async () => {
    await expect(
      loadPdf(fixtureFile('multi-page.pdf'), { limits: { maxFileSizeMb: 50, maxPages: 2 } }),
    ).rejects.toBeInstanceOf(TooManyPagesError);
  });
});