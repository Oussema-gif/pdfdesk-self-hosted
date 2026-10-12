import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPdf } from './loadPdf';
import { pageItemsFromSource } from './pageModel';
import { splitByRanges, zipOutputs } from './split';
import type { FileId, LoadedSource } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../../tests/fixtures');
const LIMITS = { maxFileSizeMb: 50, maxPages: 500 };

function fixtureFile(name: string): File {
  const buf = readFileSync(resolve(FIXTURES, name));
  return new File([buf], name, { type: 'application/pdf' });
}

async function loadMulti(): Promise<{ src: LoadedSource; map: Map<FileId, LoadedSource> }> {
  const src = await loadPdf(fixtureFile('multi-page.pdf'), { limits: LIMITS, fileId: 'B' });
  const map = new Map<FileId, LoadedSource>([[src.fileId, src]]);
  return { src, map };
}

beforeAll(() => {
  // Prevent an unused-import error when the fixture directory is missing.
  void readFileSync;
});

describe('splitByRanges', () => {
  it('produces one PDF per range with the right page counts', async () => {
    const { src, map } = await loadMulti();
    const pages = pageItemsFromSource(src);
    const outputs = await splitByRanges(pages, map, [{ from: 1, to: 2 }, { from: 4, to: 4 }], 'multi-page');

    expect(outputs.map((o) => o.name)).toEqual([
      'multi-page-pages-1-2.pdf',
      'multi-page-pages-4.pdf',
    ]);

    const first = await PDFDocument.load(outputs[0]!.bytes);
    const second = await PDFDocument.load(outputs[1]!.bytes);
    expect(first.getPageCount()).toBe(2);
    expect(second.getPageCount()).toBe(1);
  });

  it('reports progress across output pages', async () => {
    const { src, map } = await loadMulti();
    const pages = pageItemsFromRange(src);
    const events: Array<[number, number]> = [];
    await splitByRanges(
      pages,
      map,
      [
        { from: 1, to: 2 },
        { from: 4, to: 5 },
      ],
      'multi-page',
      { onProgress: (d, t) => events.push([d, t]) },
    );
    expect(events.at(-1)).toEqual([4, 4]);
  });

  it('returns an empty list when there are no ranges', async () => {
    const { src, map } = await loadMulti();
    const outputs = await splitByRanges(pageItemsFromRange(src), map, [], 'multi-page');
    expect(outputs).toEqual([]);
  });

  it('honours an already-aborted signal', async () => {
    const { src, map } = await loadMulti();
    const controller = new AbortController();
    controller.abort();
    await expect(
      splitByRanges(pageItemsFromRange(src), map, [{ from: 1, to: 1 }], 'multi-page', {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('zipOutputs', () => {
  it('packs multiple outputs into a single zip', async () => {
    const { src, map } = await loadMulti();
    const outputs = await splitByRanges(
      pageItemsFromRange(src),
      map,
      [
        { from: 1, to: 2 },
        { from: 3, to: 5 },
      ],
      'multi-page',
    );
    const zipped = zipOutputs(outputs);
    expect(zipped).not.toBeNull();

    const entries = unzipSync(zipped!);
    const names = Object.keys(entries).sort();
    expect(names).toEqual(['multi-page-pages-1-2.pdf', 'multi-page-pages-3-5.pdf']);

    const first = await PDFDocument.load(entries['multi-page-pages-1-2.pdf']!);
    const second = await PDFDocument.load(entries['multi-page-pages-3-5.pdf']!);
    expect(first.getPageCount()).toBe(2);
    expect(second.getPageCount()).toBe(3);
  });

  it('returns null for a single output', async () => {
    const { src, map } = await loadMulti();
    const outputs = await splitByRanges(pageItemsFromRange(src), map, [{ from: 1, to: 2 }], 'multi-page');
    expect(zipOutputs(outputs)).toBeNull();
  });
});

function pageItemsFromRange(src: LoadedSource): ReturnType<typeof pageItemsFromSource> {
  return pageItemsFromSource(src);
}
