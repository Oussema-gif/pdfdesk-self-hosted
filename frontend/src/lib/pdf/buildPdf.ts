import { degrees, PDFDocument } from 'pdf-lib';
import type { FileId, LoadedSource, PageItem } from './types';

export type BuildPdfOptions = {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export class MissingSourceError extends Error {
  constructor(public readonly fileId: FileId) {
    super(`Missing source PDF for fileId "${fileId}".`);
    this.name = 'MissingSourceError';
  }
}

export function checkAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }
}

/**
 * Materialises the workspace page model into a new PDF.
 *
 * Sources are parsed once and cached, so a workspace that references the same
 * file in many positions (e.g. a duplicated page) does not re-parse it.
 * Progress is reported per output page. The abort signal is checked before
 * every page and once more before serialisation.
 */
export async function buildPdf(
  pages: readonly PageItem[],
  sources: ReadonlyMap<FileId, LoadedSource>,
  options: BuildPdfOptions = {},
): Promise<Uint8Array> {
  const { signal, onProgress } = options;
  checkAborted(signal);

  const out = await PDFDocument.create();
  const cache = new Map<FileId, PDFDocument>();
  const total = pages.length;
  let done = 0;

  for (const item of pages) {
    checkAborted(signal);

    const source = sources.get(item.fileId);
    if (source === undefined) throw new MissingSourceError(item.fileId);

    let srcDoc = cache.get(item.fileId);
    if (srcDoc === undefined) {
      srcDoc = await PDFDocument.load(source.bytes);
      cache.set(item.fileId, srcDoc);
    }

    if (item.pageIndex < 0 || item.pageIndex >= srcDoc.getPageCount()) {
      throw new Error(
        `Page index ${item.pageIndex} out of bounds for file "${source.fileName}".`,
      );
    }

    const [copied] = await out.copyPages(srcDoc, [item.pageIndex]);
    if (copied === undefined) {
      throw new Error(`pdf-lib failed to copy page ${item.pageIndex} of "${source.fileName}".`);
    }

    if (item.rotation !== 0) {
      const existing = copied.getRotation().angle;
      const next = (((existing + item.rotation) % 360) + 360) % 360;
      copied.setRotation(degrees(next));
    }

    out.addPage(copied);

    done += 1;
    onProgress?.(done, total);
  }

  checkAborted(signal);
  return await out.save();
}