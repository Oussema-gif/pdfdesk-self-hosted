import { describe, expect, it } from 'vitest';
import {
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
import type { LoadedSource } from './types';

function makeSource(fileId: string, pageCount: number): LoadedSource {
  return {
    fileId,
    fileName: `${fileId}.pdf`,
    byteLength: 0,
    pageCount,
    bytes: new Uint8Array(),
  };
}

describe('pageItemsFromSource', () => {
  it('produces one item per page with stable ids', () => {
    const items = pageItemsFromSource(makeSource('A', 3));
    expect(items.map((p) => p.id)).toEqual(['A:0', 'A:1', 'A:2']);
    expect(items.every((p) => p.rotation === 0)).toBe(true);
    expect(items.every((p) => p.selected === false)).toBe(true);
    expect(items.every((p) => p.thumbnailUrl === null)).toBe(true);
  });

  it('returns an empty array for a zero-page source', () => {
    expect(pageItemsFromSource(makeSource('A', 0))).toEqual([]);
  });
});

describe('applyRotation', () => {
  const base = pageItemsFromSource(makeSource('A', 3));
  it('rotates only the selected pages', () => {
    const next = applyRotation(base, new Set(['A:0']), 90);
    expect(next[0]?.rotation).toBe(90);
    expect(next[1]?.rotation).toBe(0);
    expect(next[2]?.rotation).toBe(0);
  });
  it('wraps past 360', () => {
    let acc = base;
    for (let i = 0; i < 4; i++) acc = applyRotation(acc, new Set(['A:0']), 90);
    expect(acc[0]?.rotation).toBe(0);
  });
  it('handles negative deltas', () => {
    const next = applyRotation(base, new Set(['A:0']), -90);
    expect(next[0]?.rotation).toBe(270);
  });
  it('does not mutate the input', () => {
    const snapshot = base.map((p) => ({ ...p }));
    applyRotation(base, new Set(['A:0']), 90);
    expect(base).toEqual(snapshot);
  });
});

describe('removePages', () => {
  const base = pageItemsFromSource(makeSource('A', 4));
  it('removes by id', () => {
    const next = removePages(base, new Set(['A:1', 'A:3']));
    expect(next.map((p) => p.id)).toEqual(['A:0', 'A:2']);
  });
  it('is a no-op when no ids match', () => {
    expect(removePages(base, new Set(['nope'])).length).toBe(4);
  });
});

describe('reorderPages', () => {
  const base = pageItemsFromSource(makeSource('A', 4));
  it('moves an item forward', () => {
    expect(reorderPages(base, 0, 2).map((p) => p.id)).toEqual(['A:1', 'A:2', 'A:0', 'A:3']);
  });
  it('moves an item backward', () => {
    expect(reorderPages(base, 3, 0).map((p) => p.id)).toEqual(['A:3', 'A:0', 'A:1', 'A:2']);
  });
  it('no-ops when from === to', () => {
    expect(reorderPages(base, 1, 1)).toEqual(base);
  });
  it('no-ops on out-of-range indices', () => {
    expect(reorderPages(base, -1, 0)).toEqual(base);
    expect(reorderPages(base, 0, 99)).toEqual(base);
  });
});

describe('selection helpers', () => {
  const base = pageItemsFromSource(makeSource('A', 3));
  it('sets and clears selection', () => {
    const on = setSelection(base, new Set(['A:1']), true);
    expect(on[1]?.selected).toBe(true);
    const off = setSelection(on, new Set(['A:1']), false);
    expect(off[1]?.selected).toBe(false);
  });
  it('selectAll marks every page', () => {
    expect(selectedIds(selectAll(base)).size).toBe(3);
  });
  it('clearSelection unmarks every page', () => {
    expect(selectedIds(clearSelection(selectAll(base))).size).toBe(0);
  });
  it('idsForSource returns ids of one file only', () => {
    const combined = [...pageItemsFromSource(makeSource('A', 2)), ...pageItemsFromSource(makeSource('B', 2))];
    expect([...idsForSource(combined, 'B')].sort()).toEqual(['B:0', 'B:1']);
  });
});