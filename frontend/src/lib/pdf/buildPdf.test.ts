import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPdf } from './loadPdf';
import { buildPdf } from './buildPdf';
import { applyRotation, pageItemsFromSource, removePages, reorderPages } from './pageModel';
import type { FileId, LoadedSource } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../../tests/fixtures');

function fixtureFile(name: string): File {
  const buf = readFileSync(resolve(FIXTURES, name));
  return new File([buf], name, { type: 'application/pdf' });
}

const LIMITS = { maxFileSizeMb: 50, maxPages: 500 };

type Sources = { a: LoadedSource; b: LoadedSource; map: Map<FileId, LoadedSource> };

async function loadPair(): Promise<Sources> {
  const a = await loadPdf(fixtureFile('normal.pdf'), { limits: LIMITS, fileId: 'A' });
  const b = await loadPdf(fixtureFile('multi-page.pdf'), { limits: LIMITS, fileId: 'B' });
  const map = new Map<FileId, LoadedSource>([
    [a.fileId, a],
    [b.fileId, b],
  ]);
  return { a, b, map };
}

beforeAll(() => {
  if (!existsSync(FIXTURES)) {
    throw new Error(
      `Fixtures missing at ${FIXTURES}. From frontend/ run: node scripts/generate-fixtures.mjs`,
    );
  }
});

describe('buildPdf', () => {
  it('merges two sources into one PDF', async () => {
    const { a, b, map } = await loadPair();
    const pages = [...pageItemsFromSource(a), ...pageItemsFromSource(b)];
    const out = await buildPdf(pages, map);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(a.pageCount + b.pageCount);
  });

  it('drops removed pages from the output', async () => {
    const { b, map } = await loadPair();
    const pages = removePages(pageItemsFromSource(b), new Set(['B:0', 'B:2']));
    const out = await buildPdf(pages, map);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
  });

  it('respects reordering', async () => {
    const { b, map } = await loadPair();
    const pages = reorderPages(pageItemsFromSource(b), 0, 4);
    expect(pages.map((p) => p.pageIndex)).toEqual([1, 2, 3, 4, 0]);
    const out = await buildPdf(pages, map);
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(5);
  });

  it('applies rotation on top of the source page', async () => {
    const { a, map } = await loadPair();
    const pages = applyRotation(pageItemsFromSource(a), new Set(['A:0']), 90);
    const out = await buildPdf(pages, map);
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getRotation().angle).toBe(90);
  });

  it('preserves the source page rotation when adding to it', async () => {
    const rotated = await loadPdf(fixtureFile('rotated.pdf'), { limits: LIMITS, fileId: 'R' });
    const map = new Map<FileId, LoadedSource>([[rotated.fileId, rotated]]);
    const pages = applyRotation(pageItemsFromSource(rotated), new Set(['R:1']), 90);
    const out = await buildPdf(pages, map);
    const doc = await PDFDocument.load(out);
    // Source page 1 has 90deg; adding 90 gives 180.
    expect(doc.getPage(1).getRotation().angle).toBe(180);
  });

  it('honours an already-aborted signal', async () => {
    const { a, map } = await loadPair();
    const controller = new AbortController();
    controller.abort();
    await expect(buildPdf(pageItemsFromSource(a), map, { signal: controller.signal })).rejects.toMatchObject(
      { name: 'AbortError' },
    );
  });

  it('reports progress once per output page', async () => {
    const { b, map } = await loadPair();
    const events: Array<[number, number]> = [];
    await buildPdf(pageItemsFromSource(b), map, {
      onProgress: (done, total) => events.push([done, total]),
    });
    expect(events).toEqual([
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [5, 5],
    ]);
  });

  it('throws when a source is missing', async () => {
    const { a } = await loadPair();
    const pages = pageItemsFromSource(a);
    await expect(buildPdf(pages, new Map())).rejects.toMatchObject({ name: 'MissingSourceError' });
  });
});