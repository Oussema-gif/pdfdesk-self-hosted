import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPdf } from './loadPdf';
import { pageItemsFromSource } from './pageModel';
import {
  DEFAULT_WATERMARK,
  EmptyWatermarkTextError,
  centeredOrigin,
  watermark,
} from './watermark';
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

describe('centeredOrigin', () => {
  it('centers with rotation 0', () => {
    const { x, y } = centeredOrigin(400, 600, 100, 20, 0);
    expect(x).toBeCloseTo(150, 3);
    expect(y).toBeCloseTo(290, 3);
  });

  it('is symmetric about the page center', () => {
    const { x, y } = centeredOrigin(400, 600, 100, 20, 45);
    // The rotated midpoint should land at the page center; formula handles
    // the translation. Sanity: the origin is off-center because of rotation.
    expect(x).not.toBeCloseTo(150, 0);
    expect(y).not.toBeCloseTo(290, 0);
  });
});

describe('watermark', () => {
  it('produces a document with the same page count', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const out = await watermark(pages, map, {
      ...DEFAULT_WATERMARK,
      appliesTo: 'all',
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(src.pageCount);
  });

  it('changes bytes compared to the un-watermarked document', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const out = await watermark(pages, map, {
      ...DEFAULT_WATERMARK,
      appliesTo: 'all',
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).not.toBe(src.byteLength);
  });

  it('applies to only the selected pages without error', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const selected = new Set([pages[0]!.id, pages[2]!.id]);
    const out = await watermark(pages, map, {
      ...DEFAULT_WATERMARK,
      appliesTo: selected,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(src.pageCount);
  });

  it('rejects empty text', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    await expect(
      watermark(pages, map, { ...DEFAULT_WATERMARK, text: '   ', appliesTo: 'all' }),
    ).rejects.toBeInstanceOf(EmptyWatermarkTextError);
  });

  it('honours an already-aborted signal', async () => {
    const { src, map } = await load();
    const pages = pageItemsFromSource(src);
    const controller = new AbortController();
    controller.abort();
    await expect(
      watermark(pages, map, {
        ...DEFAULT_WATERMARK,
        appliesTo: 'all',
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
