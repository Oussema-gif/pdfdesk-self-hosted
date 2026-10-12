import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { FileId } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const docCache = new Map<FileId, pdfjs.PDFDocumentProxy>();
const docPromises = new Map<FileId, Promise<pdfjs.PDFDocumentProxy>>();

/**
 * Loads (or returns a cached) PDF.js document for the given workspace file.
 * Passes a copy of the bytes to PDF.js because it transfers the buffer to the
 * worker.
 */
export async function getDocument(
  fileId: FileId,
  bytes: Uint8Array,
): Promise<pdfjs.PDFDocumentProxy> {
  const cached = docCache.get(fileId);
  if (cached) return cached;
  const pending = docPromises.get(fileId);
  if (pending) return pending;

  const copy = bytes.slice();
  const task = pdfjs.getDocument({
    data: copy,
    // Silence PDF.js warnings/info. Errors still throw.
    verbosity: 0,
  });
  const promise = task.promise.then((doc) => {
    docCache.set(fileId, doc);
    docPromises.delete(fileId);
    return doc;
  });
  docPromises.set(fileId, promise);
  return promise;
}

export function releaseDocument(fileId: FileId): void {
  const doc = docCache.get(fileId);
  if (doc) {
    void doc.destroy();
    docCache.delete(fileId);
  }
  docPromises.delete(fileId);
}

export function releaseAllDocuments(): void {
  for (const id of docCache.keys()) releaseDocument(id);
}
