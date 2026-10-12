export type PageRange = {
  /** 1-based inclusive */
  from: number;
  /** 1-based inclusive */
  to: number;
};

export type ParseRangesResult =
  | { ok: true; ranges: PageRange[] }
  | { ok: false; error: string };

const TOKEN_RE = /^(\d+)(?:\s*-\s*(\d+))?$/;

/**
 * Parses a human range string like "1-3, 5, 8-10" against a document of
 * `totalPages` pages. Empty input is a valid, empty result (caller decides
 * whether that means "disabled"). Whitespace tolerant. 1-based inclusive.
 */
export function parseRanges(input: string, totalPages: number): ParseRangesResult {
  if (totalPages <= 0) {
    return { ok: false, error: 'There are no pages to split.' };
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: true, ranges: [] };

  const tokens = trimmed
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return { ok: true, ranges: [] };

  const ranges: PageRange[] = [];

  for (const token of tokens) {
    const match = TOKEN_RE.exec(token);
    if (match === null) {
      return { ok: false, error: `Cannot read "${token}". Use formats like 1-3 or 5.` };
    }
    const a = Number.parseInt(match[1] ?? '', 10);
    const b = match[2] !== undefined ? Number.parseInt(match[2], 10) : a;

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { ok: false, error: `Cannot read "${token}".` };
    }
    if (a < 1 || b < 1) {
      return { ok: false, error: 'Page numbers start at 1.' };
    }
    if (b < a) {
      return { ok: false, error: `"${token}" ends before it starts.` };
    }
    if (b > totalPages) {
      return { ok: false, error: `"${token}" goes beyond page ${totalPages}.` };
    }
    ranges.push({ from: a, to: b });
  }

  return { ok: true, ranges };
}

/** Inverse of parseRanges, for round-tripping. */
export function formatRanges(ranges: readonly PageRange[]): string {
  return ranges
    .map((r) => (r.from === r.to ? `${r.from}` : `${r.from}-${r.to}`))
    .join(', ');
}

/** Total pages covered, counting overlaps multiple times. */
export function countRangePages(ranges: readonly PageRange[]): number {
  let total = 0;
  for (const r of ranges) total += r.to - r.from + 1;
  return total;
}

/** Splits `totalPages` into chunks of at most `n` pages each. */
export function chunkRanges(totalPages: number, n: number): PageRange[] {
  const size = Math.max(1, Math.floor(n));
  const out: PageRange[] = [];
  for (let start = 1; start <= totalPages; start += size) {
    const end = Math.min(start + size - 1, totalPages);
    out.push({ from: start, to: end });
  }
  return out;
}
