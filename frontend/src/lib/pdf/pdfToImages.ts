import { getDocument } from './pdfJsDocument';
import { checkAborted } from './buildPdf';
import { sanitizeBaseName } from './filename';
import type { LoadedSource } from './types';

export type PdfToImagesFormat = 'png' | 'jpg';

export type PdfToImagesOptions = {
  format: PdfToImagesFormat;
  /** Renders at `scale * 72dpi`. 2 = 144dpi, 3 = 216dpi, 4 = 288dpi. */
  scale: number;
  /** JPG only, 0..1. Ignored for PNG. */
  quality: number;
  /** 1-based page numbers in the order they should be rendered. */
  pageNumbers: readonly number[];
  /** Base filename without extension. */
  baseName: string;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export type ExportedImage = { name: string; bytes: Uint8Array };

const MIME: Record<PdfToImagesFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
};

/**
 * Expands ranges into a flat list of 1-based page numbers, preserving order.
 * Overlaps are preserved (a page listed twice is exported twice).
 */
export function expandRanges(
  ranges: readonly { from: number; to: number }[],
): number[] {
  const out: number[] = [];
  for (const r of ranges) {
    for (let i = r.from; i <= r.to; i++) out.push(i);
  }
  return out;
}

/**
 * Produces one PNG or JPG per page. Uses OffscreenCanvas when available,
 * otherwise falls back to a DOM canvas. Sequential to bound memory.
 */
export async function pdfToImages(
  source: LoadedSource,
  options: PdfToImagesOptions,
): Promise<ExportedImage[]> {
  const { format, scale, quality, pageNumbers, baseName, signal, onProgress } = options;
  const mime = MIME[format];
  const pad = String(Math.max(source.pageCount, 1)).length;
  const safeBase = sanitizeBaseName(baseName);

  if (pageNumbers.length === 0) return [];

  checkAborted(signal);
  const doc = await getDocument(source.fileId, source.bytes);

  const outputs: ExportedImage[] = [];
  let done = 0;

  for (const pageNumber of pageNumbers) {
    checkAborted(signal);
    if (pageNumber < 1 || pageNumber > source.pageCount) {
      throw new Error(`Page ${pageNumber} is outside the range 1-${source.pageCount}.`);
    }

    const page = await doc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });

    const canvas = makeCanvas(
      Math.max(1, Math.floor(viewport.width)),
      Math.max(1, Math.floor(viewport.height)),
    );
    const ctx = get2dContext(canvas);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await canvasToBlob(canvas, mime, format === 'jpg' ? quality : undefined);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    const padded = String(pageNumber).padStart(pad, '0');
    outputs.push({ name: `${safeBase}-page-${padded}.${format}`, bytes });

    done += 1;
    onProgress?.(done, pageNumbers.length);
    void baseViewport;
  }

  return outputs;
}

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function makeCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function get2dContext(canvas: AnyCanvas): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Could not get 2D context for export');
  return ctx as CanvasRenderingContext2D;
}

async function canvasToBlob(
  canvas: AnyCanvas,
  mime: string,
  quality: number | undefined,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    const opts: ImageEncodeOptions = { type: mime };
    if (quality !== undefined) opts.quality = quality;
    return await canvas.convertToBlob(opts);
  }
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob === null ? reject(new Error('Canvas export produced no blob.')) : resolve(blob)),
      mime,
      quality,
    );
  });
}
