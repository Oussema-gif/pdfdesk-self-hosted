import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MARGINS_MM,
  detectImageKind,
  imagesToPdf,
  UnsupportedImageError,
} from './imagesToPdf';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../../../tests/fixtures');

function png(): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, 'sample.png')));
}

function jpg(): Uint8Array {
  return new Uint8Array(readFileSync(resolve(FIXTURES, 'sample.jpg')));
}

describe('detectImageKind', () => {
  it('recognises PNG magic bytes', () => {
    expect(detectImageKind(png())).toBe('png');
  });

  it('recognises JPEG magic bytes', () => {
    expect(detectImageKind(jpg())).toBe('jpg');
  });

  it('rejects random bytes', () => {
    expect(detectImageKind(new Uint8Array([1, 2, 3, 4, 5]))).toBeNull();
  });
});

describe('imagesToPdf', () => {
  it('creates one page per image', async () => {
    const out = await imagesToPdf(
      [
        { name: 'a.png', bytes: png() },
        { name: 'b.jpg', bytes: jpg() },
      ],
      { pageSize: 'A4', orientation: 'portrait', marginsMm: DEFAULT_MARGINS_MM },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(2);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(841.89, 1);
  });

  it('swaps dimensions for landscape', async () => {
    const out = await imagesToPdf([{ name: 'a.png', bytes: png() }], {
      pageSize: 'A4',
      orientation: 'landscape',
      marginsMm: DEFAULT_MARGINS_MM,
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(841.89, 1);
    expect(doc.getPage(0).getHeight()).toBeCloseTo(595.28, 1);
  });

  it('uses image pixel dimensions for Fit mode', async () => {
    const out = await imagesToPdf([{ name: 'a.png', bytes: png() }], {
      pageSize: 'Fit',
      orientation: 'portrait',
      marginsMm: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    const doc = await PDFDocument.load(out);
    // sample.png is 128 x 128.
    expect(doc.getPage(0).getWidth()).toBe(128);
    expect(doc.getPage(0).getHeight()).toBe(128);
  });

  it('clamps negative margins to zero', async () => {
    const out = await imagesToPdf([{ name: 'a.png', bytes: png() }], {
      pageSize: 'A4',
      orientation: 'portrait',
      marginsMm: { top: -10, right: 0, bottom: 1000, left: 0 },
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(1);
  });

  it('reports progress once per page', async () => {
    const events: Array<[number, number]> = [];
    await imagesToPdf(
      [
        { name: 'a.png', bytes: png() },
        { name: 'b.png', bytes: png() },
        { name: 'c.png', bytes: png() },
      ],
      {
        pageSize: 'A4',
        orientation: 'portrait',
        marginsMm: DEFAULT_MARGINS_MM,
        onProgress: (d, t) => events.push([d, t]),
      },
    );
    expect(events).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('rejects unsupported bytes with a typed error', async () => {
    await expect(
      imagesToPdf([{ name: 'not.png', bytes: new Uint8Array([1, 2, 3]) }], {
        pageSize: 'A4',
        orientation: 'portrait',
        marginsMm: DEFAULT_MARGINS_MM,
      }),
    ).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it('honours an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      imagesToPdf([{ name: 'a.png', bytes: png() }], {
        pageSize: 'A4',
        orientation: 'portrait',
        marginsMm: DEFAULT_MARGINS_MM,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});
