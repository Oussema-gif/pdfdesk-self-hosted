export type FileId = string;
export type PageId = string;

/**
 * A source PDF that has been loaded into the workspace. `bytes` is kept
 * around so `buildPdf` can re-open the document without a second file read.
 */
export type LoadedSource = {
  fileId: FileId;
  fileName: string;
  byteLength: number;
  pageCount: number;
  bytes: Uint8Array;
};

/**
 * One page as it appears in the workspace. `id` is stable and derived from
 * the source file + source page index, so it survives reordering, rotation,
 * and removal of other pages.
 */
export type PageItem = {
  id: PageId;
  fileId: FileId;
  /** 0-based index into the source document. */
  pageIndex: number;
  /** Additional rotation applied on top of the source page's own rotation. */
  rotation: 0 | 90 | 180 | 270;
  /** Populated by the UI layer. The engine never reads or writes this. */
  thumbnailUrl: string | null;
  /** UI-only selection state. The engine provides pure helpers to change it. */
  selected: boolean;
};

export function makePageId(fileId: FileId, pageIndex: number): PageId {
  return `${fileId}:${pageIndex}`;
}