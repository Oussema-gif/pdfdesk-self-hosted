import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPdf } from './loadPdf';
import { pageItemsFromSource } from './pageModel';
import {
  DEFAULT_PAGE_NUMBERS,
  formatPageNumber,
  pageNumberOrigin,
  pageNumbers,
} from './pageNumbers';
import type { FileId, LoadedSource } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../../tests/fixtures');
const LIMITS = { maxFileSizeMb: 50, maxPages: 500 };

function fixtureFile(name: string): File {
  const buf = readFileSync(resolve(FIXTURES, name));
  return new File([buf], name, { type: 'application/pdf' });
}

async function load(): Promise<{ src: LoadedSource; map: Map<FileId, LoadedSource> }> {
  const src = await loadPdf(fixtureFile('multi-page.pdf'), { limits: LIMITS, fileId: 'B' });
  return { src, map: new Map<FileId, LoadedSource>([[src.fileId, src]]) };
}

beforeAll(() => {
  void readFileSync;
});

describe('formatPageNumber', () => {
  it('renders plain numbers', () => {
    expect(formatPageNumber('plain', 3, 10)).toBe('3');
  });
  it('renders "Page N"', () => {
    expect(formatPageNumber('page-n', 3, 10)).toBe('Page 3');
  });
  it('renders "Page N of T"', () => {
    expect(formatPageNumber('page-n-of-total', 3, 10)).toBe('Page 3 of 10');
  });
});

describe('pageNumberOrigin', () => {
  it('places bottom-center with margin', () => {
    const { x, y } = pageNumberOrigin(400, 600, 20, 10, 'bottom-center', 24);
    expect(x).toBeCloseTo((400 - 20) / 2, 3);
    expect(y).toBe(24);
  });
  it('places top-right with margin', () => {
    const { x, y } = pageNumberOrigin(400, 600, 20, 10, 'top-right', 24);
    expect(x).toBeCloseTo(400 - 20 - 24, 3);
    expect(y).toBeCloseTo(600 - 10 - 24, 3);
  });
});

describe('pageNumbers', () => {
  it('produces a document with the same page count', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const out = await pageNumbers(pages, map, { ...DEFAULT_PAGE_NUMBERS });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(src.pageCount);
  });

  it('skipFirstPage does not throw and produces a document', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const out = await pageNumbers(pages, map, {
      ...DEFAULT_PAGE_NUMBERS,
      skipFirstPage: true,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(src.pageCount);
  });

  it('different startNumber produces different bytes', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const a = await pageNumbers(pages, map, { ...DEFAULT_PAGE_NUMBERS, startNumber: 1 });
    const b = await pageNumbers(pages, map, { ...DEFAULT_PAGE_NUMBERS, startNumber: 100 });
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });

  it('honours an already-aborted signal', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const controller = new AbortController();
    controller.abort();
    await expect(
      pageNumbers(pages, map, { ...DEFAULT_PAGE_NUMBERS, signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
