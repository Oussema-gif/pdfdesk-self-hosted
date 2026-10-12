import { PDFDocument } from 'pdf-lib';
import { checkAborted } from './buildPdf';

export type PageSizePreset = 'A4' | 'Letter' | 'Fit';
export type Orientation = 'portrait' | 'landscape';
export type Margins = { top: number; right: number; bottom: number; left: number };

export type ImageInput = {
  name: string;
  bytes: Uint8Array;
};

export type ImagesToPdfOptions = {
  pageSize: PageSizePreset;
  orientation: Orientation;
  /** All four margins, in millimetres. */
  marginsMm: Margins;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

export const DEFAULT_MARGINS_MM: Margins = { top: 10, right: 10, bottom: 10, left: 10 };

const MM_TO_PT = 72 / 25.4;
const A4_PT: [number, number] = [595.28, 841.89];
const LETTER_PT: [number, number] = [612, 792];
const MAX_MARGIN_MM = 50;

function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export class UnsupportedImageError extends Error {
  constructor(public readonly fileName: string) {
    super(`"${fileName}" is not a PNG or JPG.`);
    this.name = 'UnsupportedImageError';
  }
}

export function detectImageKind(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (isPng(bytes)) return 'png';
  if (isJpeg(bytes)) return 'jpg';
  return null;
}

function clampMargins(m: Margins): Margins {
  const clamp = (n: number): number =>
    Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), MAX_MARGIN_MM);
  return {
    top: clamp(m.top),
    right: clamp(m.right),
    bottom: clamp(m.bottom),
    left: clamp(m.left),
  };
}

function resolvePageSize(preset: PageSizePreset): [number, number] {
  if (preset === 'Letter') return [...LETTER_PT];
  return [...A4_PT];
}

/**
 * Builds a PDF from an ordered list of PNG/JPG images. A4/Letter honour the
 * orientation; Fit uses the image's own pixel dimensions as points (72 dpi).
 * Margins are applied in millimetres on every page.
 */
export async function imagesToPdf(
  images: readonly ImageInput[],
  options: ImagesToPdfOptions,
): Promise<Uint8Array> {
  const { pageSize, orientation, marginsMm, signal, onProgress } = options;
  const margins = clampMargins(marginsMm);
  checkAborted(signal);

  const out = await PDFDocument.create();
  const total = images.length;
  let done = 0;

  for (const img of images) {
    checkAborted(signal);
    const kind = detectImageKind(img.bytes);
    if (kind === null) throw new UnsupportedImageError(img.name);

    const embedded =
      kind === 'png' ? await out.embedPng(img.bytes) : await out.embedJpg(img.bytes);

    let pageW: number;
    let pageH: number;

    if (pageSize === 'Fit') {
      pageW = embedded.width;
      pageH = embedded.height;
      if (orientation === 'landscape' && pageH > pageW) {
        [pageW, pageH] = [pageH, pageW];
      } else if (orientation === 'portrait' && pageW > pageH) {
        [pageW, pageH] = [pageH, pageW];
      }
    } else {
      const [w, h] = resolvePageSize(pageSize);
      if (orientation === 'landscape') {
        pageW = h;
        pageH = w;
      } else {
        pageW = w;
        pageH = h;
      }
    }

    const drawW = pageW - (margins.left + margins.right) * MM_TO_PT;
    const drawH = pageH - (margins.top + margins.bottom) * MM_TO_PT;
    if (drawW <= 0 || drawH <= 0) {
      throw new Error('Margins are too large for the chosen page size.');
    }

    const scale = Math.min(drawW / embedded.width, drawH / embedded.height);
    const w = embedded.width * scale;
    const h = embedded.height * scale;
    const x = margins.left * MM_TO_PT + (drawW - w) / 2;
    const y = margins.bottom * MM_TO_PT + (drawH - h) / 2;

    const page = out.addPage([pageW, pageH]);
    page.drawImage(embedded, { x, y, width: w, height: h });

    done += 1;
    onProgress?.(done, total);
  }

  checkAborted(signal);
  return await out.save();
}
