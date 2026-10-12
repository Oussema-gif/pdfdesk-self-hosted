import { makePageId, type FileId, type LoadedSource, type PageId, type PageItem } from './types';

export function pageItemsFromSource(source: LoadedSource): PageItem[] {
  const out: PageItem[] = [];
  for (let i = 0; i < source.pageCount; i++) {
    out.push({
      id: makePageId(source.fileId, i),
      fileId: source.fileId,
      pageIndex: i,
      rotation: 0,
      thumbnailUrl: null,
      selected: false,
    });
  }
  return out;
}

export function applyRotation(
  pages: readonly PageItem[],
  ids: ReadonlySet<PageId>,
  delta: 90 | -90 | 180,
): PageItem[] {
  return pages.map((p) => {
    if (!ids.has(p.id)) return p;
    const next = (((p.rotation + delta) % 360) + 360) % 360;
    return { ...p, rotation: next as PageItem['rotation'] };
  });
}

export function removePages(pages: readonly PageItem[], ids: ReadonlySet<PageId>): PageItem[] {
  return pages.filter((p) => !ids.has(p.id));
}

export function reorderPages(pages: readonly PageItem[], from: number, to: number): PageItem[] {
  if (from === to) return pages.slice();
  if (from < 0 || from >= pages.length) return pages.slice();
  if (to < 0 || to >= pages.length) return pages.slice();
  const next = pages.slice();
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

export function setSelection(
  pages: readonly PageItem[],
  ids: ReadonlySet<PageId>,
  selected: boolean,
): PageItem[] {
  return pages.map((p) => (ids.has(p.id) && p.selected !== selected ? { ...p, selected } : p));
}

export function selectAll(pages: readonly PageItem[]): PageItem[] {
  return pages.map((p) => (p.selected ? p : { ...p, selected: true }));
}

export function clearSelection(pages: readonly PageItem[]): PageItem[] {
  return pages.map((p) => (p.selected ? { ...p, selected: false } : p));
}

export function selectedIds(pages: readonly PageItem[]): Set<PageId> {
  const out = new Set<PageId>();
  for (const p of pages) if (p.selected) out.add(p.id);
  return out;
}

/** Convenience for callers that only have file ids handy. */
export function idsForSource(pages: readonly PageItem[], fileId: FileId): Set<PageId> {
  const out = new Set<PageId>();
  for (const p of pages) if (p.fileId === fileId) out.add(p.id);
  return out;
}