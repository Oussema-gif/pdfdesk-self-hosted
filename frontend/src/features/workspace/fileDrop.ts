export const ACCEPTED_MIME_TYPES = ['application/pdf'] as const;
export const ACCEPTED_EXTENSIONS = ['.pdf'] as const;
export const ACCEPT_ATTR = 'application/pdf,.pdf';

/** Extracts files from a drop event, preferring modern DataTransfer items. */
export function filesFromDataTransfer(dt: DataTransfer): File[] {
  if (dt.items && dt.items.length > 0) {
    const out: File[] = [];
    for (const item of dt.items) {
      if (item.kind !== 'file') continue;
      const file = item.getAsFile();
      if (file) out.push(file);
    }
    if (out.length > 0) return out;
  }
  return Array.from(dt.files);
}

export type FilterResult = {
  accepted: File[];
  rejected: File[];
};

/**
 * Accepts a file when its name ends in .pdf (case-insensitive) OR its MIME
 * type is application/pdf. An empty MIME type does NOT alone qualify a file —
 * content validation (the %PDF- magic byte check in loadPdf) is authoritative,
 * but this filter avoids reading obviously wrong files.
 */
export function filterAcceptedFiles(files: readonly File[]): FilterResult {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    const nameLower = file.name.toLowerCase();
    const hasPdfExt = ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
    const hasPdfType = file.type === 'application/pdf';
    if (hasPdfExt || hasPdfType) accepted.push(file);
    else rejected.push(file);
  }
  return { accepted, rejected };
}
