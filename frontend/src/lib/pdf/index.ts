export { makePageId } from './types';
export type { FileId, LoadedSource, PageId, PageItem } from './types';

export {
  EncryptedPdfError,
  FileTooLargeError,
  MalformedPdfError,
  NotAPdfError,
  PdfDeskError,
  TooManyPagesError,
} from './errors';

export { hasPdfMagic } from './magicBytes';

export { loadPdf } from './loadPdf';
export type { LoadPdfLimits, LoadPdfOptions } from './loadPdf';

export {
  applyRotation,
  clearSelection,
  idsForSource,
  pageItemsFromSource,
  removePages,
  reorderPages,
  selectAll,
  selectedIds,
  setSelection,
} from './pageModel';

export { buildPdf, checkAborted, MissingSourceError } from './buildPdf';
export type { BuildPdfOptions } from './buildPdf';

export {
  mergedFileName,
  pagesRangeFileName,
  sanitizeBaseName,
  zipFileName,
} from './filename';

export {
  releaseAllDocuments,
  releaseDocument,
  renderPageToCanvas,
} from './thumbnailRenderer';
export type { RenderThumbnailRequest } from './thumbnailRenderer';

export {
  chunkRanges,
  countRangePages,
  formatRanges,
  parseRanges,
} from './ranges';
export type { PageRange, ParseRangesResult } from './ranges';

export { splitByRanges, zipOutputs } from './split';
export type { SplitOutput, SplitOptions } from './split';

export {
  DEFAULT_MARGINS_MM,
  detectImageKind,
  imagesToPdf,
  UnsupportedImageError,
} from './imagesToPdf';
export type {
  ImageInput,
  ImagesToPdfOptions,
  Margins,
  Orientation,
  PageSizePreset,
} from './imagesToPdf';

export { expandRanges, pdfToImages } from './pdfToImages';
export type {
  ExportedImage,
  PdfToImagesFormat,
  PdfToImagesOptions,
} from './pdfToImages';

export {
  DEFAULT_WATERMARK,
  EmptyWatermarkTextError,
  centeredOrigin,
  watermark,
} from './watermark';
export type { WatermarkOptions, WatermarkPosition } from './watermark';

export {
  DEFAULT_PAGE_NUMBERS,
  formatPageNumber,
  pageNumberOrigin,
  pageNumbers,
} from './pageNumbers';
export type {
  PageNumberFormat,
  PageNumberPosition,
  PageNumbersOptions,
} from './pageNumbers';
