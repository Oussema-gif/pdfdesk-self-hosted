import { PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import { buildPdf, checkAborted } from './buildPdf';
import type { FileId, LoadedSource, PageItem } from './types';

export type PageNumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right';

export type PageNumberFormat = 'plain' | 'page-n' | 'page-n-of-total';

export type PageNumbersOptions = {
  position: PageNumberPosition;
  format: PageNumberFormat;
  /** First page number to display (1 by default). */
  startNumber: number;
  /** If true, the first output page is not numbered. */
  skipFirstPage: boolean;
  fontSize: number;
  /** Space between text and page edge, in points. */
  margin: number;
  /** 0..1 rgb channels. */
  color: { r: number; g: number; b: number };
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export const DEFAULT_PAGE_NUMBERS: Omit<PageNumbersOptions, 'signal' | 'onProgress'> = {
  position: 'bottom-center',
  format: 'plain',
  startNumber: 1,
  skipFirstPage: false,
  fontSize: 11,
  margin: 24,
  color: { r: 0.15, g: 0.15, b: 0.15 },
};

export function formatPageNumber(
  format: PageNumberFormat,
  n: number,
  total: number,
): string {
  switch (format) {
    case 'plain':
      return `${n}`;
    case 'page-n':
      return `Page ${n}`;
    case 'page-n-of-total':
      return `Page ${n} of ${total}`;
  }
}

export function pageNumberOrigin(
  pageW: number,
  pageH: number,
  textW: number,
  textH: number,
  position: PageNumberPosition,
  margin: number,
): { x: number; y: number } {
  switch (position) {
    case 'bottom-left':
      return { x: margin, y: margin };
    case 'bottom-center':
      return { x: (pageW - textW) / 2, y: margin };
    case 'bottom-right':
      return { x: pageW - textW - margin, y: margin };
    case 'top-left':
      return { x: margin, y: pageH - textH - margin };
    case 'top-center':
      return { x: (pageW - textW) / 2, y: pageH - textH - margin };
    case 'top-right':
      return { x: pageW - textW - margin, y: pageH - textH - margin };
  }
}

export async function pageNumbers(
  pages: readonly PageItem[],
  sources: ReadonlyMap<FileId, LoadedSource>,
  options: PageNumbersOptions,
): Promise<Uint8Array> {
  const {
    position,
    format,
    startNumber,
    skipFirstPage,
    fontSize,
    margin,
    color,
    signal,
    onProgress,
  } = options;

  checkAborted(signal);

  const baseBytes = await buildPdf(pages, sources, {
    ...(signal ? { signal } : {}),
    ...(onProgress
      ? { onProgress: (done, total) => onProgress(done, total) }
      : {}),
  });

  checkAborted(signal);
  const pdf = await PDFDocument.load(baseBytes);
  const font: PDFFont = await pdf.embedFont(StandardFonts.Helvetica);
  const pdfPages = pdf.getPages();
  const total = pdfPages.length;
  const start = Math.max(1, Math.trunc(startNumber));

  for (let i = 0; i < total; i++) {
    checkAborted(signal);
    if (skipFirstPage && i === 0) continue;

    const page = pdfPages[i]!;
    const { width, height } = page.getSize();
    const displayNumber = start + i;
    const label = formatPageNumber(format, displayNumber, total);
    const textW = font.widthOfTextAtSize(label, fontSize);
    const textH = font.heightAtSize(fontSize);
    const { x, y } = pageNumberOrigin(width, height, textW, textH, position, margin);

    page.drawText(label, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  }

  checkAborted(signal);
  return await pdf.save();
}
