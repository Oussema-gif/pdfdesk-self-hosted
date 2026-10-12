import { zipSync } from 'fflate';
import { buildPdf, checkAborted } from './buildPdf';
import { pagesRangeFileName, sanitizeBaseName, zipFileName } from './filename';
import type { PageRange } from './ranges';
import { countRangePages } from './ranges';
import type { FileId, LoadedSource, PageItem } from './types';

export type SplitOutput = { name: string; bytes: Uint8Array };

export type SplitOptions = {
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

function pagesInRange(pages: readonly PageItem[], range: PageRange): PageItem[] {
  // Range is 1-based inclusive against the current ordered page list.
  return pages.slice(range.from - 1, range.to);
}

/**
 * Produces one PDF per range. Each PDF contains the pages in that range
 * in the current workspace order, so cross-file reorders are preserved.
 * Progress is reported across output pages, not output files.
 */
export async function splitByRanges(
  pages: readonly PageItem[],
  sources: ReadonlyMap<FileId, LoadedSource>,
  ranges: readonly PageRange[],
  baseName: string,
  options: SplitOptions = {},
): Promise<SplitOutput[]> {
  const { signal, onProgress } = options;
  const safeBase = sanitizeBaseName(baseName);

  if (ranges.length === 0) return [];

  const totalPages = countRangePages(ranges);
  let done = 0;

  const outputs: SplitOutput[] = [];
  for (const range of ranges) {
    checkAborted(signal);
    const subset = pagesInRange(pages, range);
    if (subset.length === 0) continue;

    const bytes = await buildPdf(subset, sources, {
      ...(signal ? { signal } : {}),
      onProgress: (d) => {
        done += 1;
        onProgress?.(Math.min(done, totalPages), totalPages);
        void d;
      },
    });

    const label = range.from === range.to ? `${range.from}` : `${range.from}-${range.to}`;
    outputs.push({ name: pagesRangeFileName(safeBase, label), bytes });
  }

  return outputs;
}

/** Wraps a set of outputs into a single ZIP. Returns null when there are fewer than two. */
export function zipOutputs(outputs: readonly SplitOutput[]): Uint8Array | null {
  if (outputs.length < 2) return null;
  const map: Record<string, Uint8Array> = {};
  for (const out of outputs) {
    map[out.name] = out.bytes;
  }
  return zipSync(map, { level: 6 });
}

export { zipFileName };
