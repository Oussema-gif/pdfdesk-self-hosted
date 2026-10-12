import { describe, expect, it } from 'vitest';
import { expandRanges } from './pdfToImages';
import { chunkRanges, countRangePages, parseRanges } from './ranges';

describe('expandRanges', () => {
  it('expands contiguous ranges in order', () => {
    expect(expandRanges([{ from: 1, to: 3 }])).toEqual([1, 2, 3]);
  });

  it('preserves token order across ranges', () => {
    expect(expandRanges([{ from: 4, to: 5 }, { from: 1, to: 2 }])).toEqual([4, 5, 1, 2]);
  });

  it('preserves overlaps', () => {
    expect(expandRanges([{ from: 1, to: 2 }, { from: 2, to: 3 }])).toEqual([1, 2, 2, 3]);
  });

  it('returns empty for empty input', () => {
    expect(expandRanges([])).toEqual([]);
  });
});

describe('integration with ranges parser', () => {
  it('parses "1-3, 5" into the right page numbers', () => {
    const r = parseRanges('1-3, 5', 10);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(expandRanges(r.ranges)).toEqual([1, 2, 3, 5]);
    expect(countRangePages(r.ranges)).toBe(4);
  });

  it('passes "every N" chunks through', () => {
    const ranges = chunkRanges(5, 2);
    expect(expandRanges(ranges)).toEqual([1, 2, 3, 4, 5]);
  });
});
