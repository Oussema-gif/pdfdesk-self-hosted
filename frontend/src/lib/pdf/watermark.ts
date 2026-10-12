import { degrees, PDFDocument, rgb, StandardFonts, type PDFFont } from 'pdf-lib';
import { buildPdf, checkAborted } from './buildPdf';
import type { FileId, LoadedSource, PageId, PageItem } from './types';

export type WatermarkPosition = 'center' | 'diagonal';

export type WatermarkOptions = {
  text: string;
  /** In PDF points. 48 is a reasonable default. */
  fontSize: number;
  /** 0..1, applied to the drawn text. 0.15 is subtle. */
  opacity: number;
  /** Rotation in degrees. Only used when position === 'center'. */
  rotation: number;
  position: WatermarkPosition;
  /** 0..1 rgb channels. */
  color: { r: number; g: number; b: number };
  /** 'all' or an explicit set of workspace page ids. */
  appliesTo: 'all' | ReadonlySet<PageId>;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export const DEFAULT_WATERMARK: Omit<WatermarkOptions, 'appliesTo' | 'signal' | 'onProgress'> = {
  text: 'CONFIDENTIAL',
  fontSize: 64,
  opacity: 0.15,
  rotation: 45,
  position: 'diagonal',
  color: { r: 0.85, g: 0.1, b: 0.1 },
};

export class EmptyWatermarkTextError extends Error {
  constructor() {
    super('Enter some watermark text.');
    this.name = 'EmptyWatermarkTextError';
  }
}

/**
 * Computes the (x, y) baseline origin so that a rectangle of size (textW, textH)
 * ends up centered at (pageW/2, pageH/2) after being rotated by `rotationDeg`
 * around its own baseline origin.
 */
export function centeredOrigin(
  pageW: number,
  pageH: number,
  textW: number,
  textH: number,
  rotationDeg: number,
): { x: number; y: number } {
  const theta = (rotationDeg * Math.PI) / 180;
  const cx = textW / 2;
  const cy = textH / 2;
  const rx = cx * Math.cos(theta) - cy * Math.sin(theta);
  const ry = cx * Math.sin(theta) + cy * Math.cos(theta);
  return { x: pageW / 2 - rx, y: pageH / 2 - ry };
}

export async function watermark(
  pages: readonly PageItem[],
  sources: ReadonlyMap<FileId, LoadedSource>,
  options: WatermarkOptions,
): Promise<Uint8Array> {
  const {
    text,
    fontSize,
    opacity,
    rotation,
    position,
    color,
    appliesTo,
    signal,
    onProgress,
  } = options;

  if (text.trim().length === 0) throw new EmptyWatermarkTextError();
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

  const shouldApply = (index: number): boolean => {
    if (appliesTo === 'all') return true;
    const item = pages[index];
    if (item === undefined) return false;
    return appliesTo.has(item.id);
  };

  for (let i = 0; i < pdfPages.length; i++) {
    checkAborted(signal);
    if (!shouldApply(i)) continue;

    const page = pdfPages[i]!;
    const { width, height } = page.getSize();
    const textW = font.widthOfTextAtSize(text, fontSize);
    const textH = font.heightAtSize(fontSize);

    const rotationDeg = position === 'diagonal' ? 45 : rotation;
    const { x, y } = centeredOrigin(width, height, textW, textH, rotationDeg);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotationDeg),
    });
  }

  checkAborted(signal);
  return await pdf.save();
}
