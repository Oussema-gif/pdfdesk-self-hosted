import { PDFDocument } from 'pdf-lib';
import { hasPdfMagic } from './magicBytes';
import {
  EncryptedPdfError,
  FileTooLargeError,
  MalformedPdfError,
  NotAPdfError,
  PdfDeskError,
  TooManyPagesError,
} from './errors';
import type { FileId, LoadedSource } from './types';

export type LoadPdfLimits = {
  maxFileSizeMb: number;
  maxPages: number;
};

export type LoadPdfOptions = {
  limits: LoadPdfLimits;
  /** If omitted, a fresh random id is generated. */
  fileId?: FileId;
};

function newFileId(): FileId {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isEncryptedMessage(message: string): boolean {
  return /is encrypted/i.test(message);
}

/**
 * Loads a File into the workspace. Throws a typed PdfDeskError subclass on
 * failure — never a raw library error.
 *
 * Everything after the magic-byte check runs inside a single try/catch. This
 * matters because pdf-lib does not always reject malformed input at load
 * time: it can return a partially-parsed document whose page tree throws when
 * traversed. Wrapping the whole flow means no library quirk escapes as a
 * raw TypeError.
 */
export async function loadPdf(file: File, options: LoadPdfOptions): Promise<LoadedSource> {
  const { limits, fileId = newFileId() } = options;

  const byteLength = file.size;
  const limitBytes = limits.maxFileSizeMb * 1024 * 1024;
  if (byteLength > limitBytes) {
    throw new FileTooLargeError(file.name, limits.maxFileSizeMb);
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (!hasPdfMagic(bytes)) {
    throw new NotAPdfError(file.name);
  }

  try {
    const doc = await PDFDocument.load(bytes);
    const pageCount = doc.getPageCount();

    if (pageCount === 0) {
      throw new MalformedPdfError(file.name, new Error('PDF contains zero pages'));
    }
    if (pageCount > limits.maxPages) {
      throw new TooManyPagesError(file.name, limits.maxPages, pageCount);
    }

    return {
      fileId,
      fileName: file.name,
      byteLength,
      pageCount,
      bytes,
    };
  } catch (error) {
    if (error instanceof PdfDeskError) throw error;
    if (error instanceof Error && isEncryptedMessage(error.message)) {
      throw new EncryptedPdfError(file.name);
    }
    throw new MalformedPdfError(file.name, error);
  }
}
