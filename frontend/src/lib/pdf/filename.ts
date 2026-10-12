/**
 * Strips the extension and any characters that are unsafe in a filename,
 * collapses runs of separators, and truncates to 80 chars. Falls back to
 * "document" when nothing usable remains.
 */
export function sanitizeBaseName(name: string): string {
  const noExt = name.replace(/\.[^.]+$/, '');
  const safe = noExt
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 80);
  return safe.length > 0 ? safe : 'document';
}

export function mergedFileName(): string {
  return 'merged.pdf';
}

export function pagesRangeFileName(baseName: string, ranges: string): string {
  return `${sanitizeBaseName(baseName)}-pages-${ranges}.pdf`;
}

export function zipFileName(): string {
  return 'pdfdesk-output.zip';
}
