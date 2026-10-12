import { describe, expect, it } from 'vitest';
import { chunkRanges, countRangePages, formatRanges, parseRanges } from './ranges';

describe('parseRanges', () => {
  it('parses a simple range', () => {
    const r = parseRanges('1-3', 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ranges).toEqual([{ from: 1, to: 3 }]);
  });

  it('parses multiple mixed tokens', () => {
    const r = parseRanges('1-3, 5, 8-10', 20);
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.ranges).toEqual([
        { from: 1, to: 3 },
        { from: 5, to: 5 },
        { from: 8, to: 10 },
      ]);
  });

  it('tolerates extra whitespace', () => {
    const r = parseRanges('  1 - 3 ,  5  ', 10);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ranges).toEqual([{ from: 1, to: 3 }, { from: 5, to: 5 }]);
  });

  it('returns an empty list for empty input', () => {
    const r = parseRanges('   ', 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.ranges).toEqual([]);
  });

  it('rejects malformed tokens', () => {
    expect(parseRanges('abc', 5).ok).toBe(false);
    expect(parseRanges('1-a', 5).ok).toBe(false);
    expect(parseRanges('1-3-5', 5).ok).toBe(false);
  });

  it('rejects inverted ranges', () => {
    expect(parseRanges('5-2', 10).ok).toBe(false);
  });

  it('rejects out-of-bounds ranges', () => {
    expect(parseRanges('1-11', 10).ok).toBe(false);
    expect(parseRanges('0-1', 10).ok).toBe(false);
  });

  it('rejects a document with no pages', () => {
    expect(parseRanges('1-1', 0).ok).toBe(false);
  });
});

describe('formatRanges', () => {
  it('round-trips a parse', () => {
    const r = parseRanges('1-3, 5, 8-10', 20);
    expect(r.ok).toBe(true);
    if (r.ok) expect(formatRanges(r.ranges)).toBe('1-3, 5, 8-10');
  });

  it('renders single-page ranges without a dash', () => {
    expect(formatRanges([{ from: 7, to: 7 }])).toBe('7');
  });
});

describe('countRangePages', () => {
  it('counts total covered pages', () => {
    expect(
      countRangePages([
        { from: 1, to: 3 },
        { from: 5, to: 5 },
      ]),
    ).toBe(4);
  });

  it('counts overlaps independently', () => {
    expect(
      countRangePages([
        { from: 1, to: 3 },
        { from: 3, to: 5 },
      ]),
    ).toBe(6);
  });
});

describe('chunkRanges', () => {
  it('splits evenly when total is a multiple', () => {
    expect(chunkRanges(6, 2)).toEqual([
      { from: 1, to: 2 },
      { from: 3, to: 4 },
      { from: 5, to: 6 },
    ]);
  });

  it('handles a remainder', () => {
    expect(chunkRanges(7, 3)).toEqual([
      { from: 1, to: 3 },
      { from: 4, to: 6 },
      { from: 7, to: 7 },
    ]);
  });

  it('clamps n to at least 1', () => {
    expect(chunkRanges(3, 0)).toEqual([
      { from: 1, to: 1 },
      { from: 2, to: 2 },
      { from: 3, to: 3 },
    ]);
  });

  it('returns empty for zero total', () => {
    expect(chunkRanges(0, 5)).toEqual([]);
  });
});
