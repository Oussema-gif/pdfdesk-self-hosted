import type * as pdfjs from 'pdfjs-dist';
import { getDocument, releaseAllDocuments, releaseDocument } from './pdfJsDocument';
import type { FileId } from './types';

export { releaseAllDocuments, releaseDocument };

/** Simple FIFO semaphore so 100 thumbnails don't queue 100 render tasks. */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];
  constructor(permits: number) {
    this.permits = permits;
  }
  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits -= 1;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }
  release(): void {
    const next = this.queue.shift();
    if (next) next();
    else this.permits += 1;
  }
}

const renderSlots = new Semaphore(3);

export type RenderThumbnailRequest = {
  fileId: FileId;
  bytes: Uint8Array;
  /** 0-based index into the source document. */
  pageIndex: number;
  /** Additional rotation applied on top of the source page's own rotation. */
  userRotation: number;
  canvas: HTMLCanvasElement;
  /** CSS pixel width cap for the rendered thumbnail. */
  maxWidth: number;
};

export async function renderPageToCanvas(request: RenderThumbnailRequest): Promise<void> {
  const { fileId, bytes, pageIndex, userRotation, canvas, maxWidth } = request;
  await renderSlots.acquire();
  try {
    const doc = await getDocument(fileId, bytes);
    const page: pdfjs.PDFPageProxy = await doc.getPage(pageIndex + 1);

    const baseViewport = page.getViewport({ scale: 1 });
    const rawScale = maxWidth / baseViewport.width;
    const scale = Math.min(Math.max(rawScale, 0.1), 2);

    const composedRotation = ((baseViewport.rotation + userRotation) % 360 + 360) % 360;
    const viewport = page.getViewport({ scale, rotation: composedRotation });

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d');
    if (ctx === null) throw new Error('Could not get 2D context for thumbnail');

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    ctx.restore();
  } finally {
    renderSlots.release();
  }
}
