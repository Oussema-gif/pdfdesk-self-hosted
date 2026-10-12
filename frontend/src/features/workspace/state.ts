import {
  applyRotation,
  pageItemsFromSource,
  removePages,
  reorderPages,
  setSelection,
  type FileId,
  type LoadedSource,
  type PageId,
  type PageItem,
} from '../../lib/pdf';

export type WorkspaceState = {
  sources: Map<FileId, LoadedSource>;
  pages: PageItem[];
  /** Number of files currently being parsed. >0 means loading in progress. */
  loadingCount: number;
  building: boolean;
  buildProgress: { done: number; total: number } | null;
  lastSelectedId: PageId | null;
};

export const initialWorkspaceState: WorkspaceState = {
  sources: new Map(),
  pages: [],
  loadingCount: 0,
  building: false,
  buildProgress: null,
  lastSelectedId: null,
};

export type WorkspaceAction =
  | { type: 'ADD_SOURCES'; sources: LoadedSource[] }
  | { type: 'REMOVE_SOURCE'; fileId: FileId }
  | { type: 'ROTATE'; ids: Set<PageId>; delta: 90 | -90 | 180 }
  | { type: 'REMOVE_PAGES'; ids: Set<PageId> }
  | { type: 'MOVE'; from: number; to: number }
  | { type: 'SELECT'; id: PageId; mode: 'replace' | 'toggle' | 'range' }
  | { type: 'SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'RESET' }
  | { type: 'LOADING_START' }
  | { type: 'LOADING_END' }
  | { type: 'BUILD_START' }
  | { type: 'BUILD_PROGRESS'; done: number; total: number }
  | { type: 'BUILD_END' };

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'ADD_SOURCES': {
      if (action.sources.length === 0) return state;
      const sources = new Map(state.sources);
      const added: PageItem[] = [];
      for (const src of action.sources) {
        sources.set(src.fileId, src);
        added.push(...pageItemsFromSource(src));
      }
      return { ...state, sources, pages: [...state.pages, ...added] };
    }

    case 'REMOVE_SOURCE': {
      if (!state.sources.has(action.fileId)) return state;
      const sources = new Map(state.sources);
      sources.delete(action.fileId);
      return {
        ...state,
        sources,
        pages: state.pages.filter((p) => p.fileId !== action.fileId),
        lastSelectedId: null,
      };
    }

    case 'ROTATE':
      return { ...state, pages: applyRotation(state.pages, action.ids, action.delta) };

    case 'REMOVE_PAGES': {
      const pages = removePages(state.pages, action.ids);
      if (pages.length === state.pages.length) return state;
      return { ...state, pages, lastSelectedId: null };
    }

    case 'MOVE':
      return { ...state, pages: reorderPages(state.pages, action.from, action.to) };

    case 'SELECT': {
      const { id, mode } = action;

      if (mode === 'toggle') {
        const current = state.pages.find((p) => p.id === id);
        if (!current) return state;
        const pages = setSelection(state.pages, new Set([id]), !current.selected);
        return { ...state, pages, lastSelectedId: id };
      }

      if (mode === 'replace' || state.lastSelectedId === null) {
        const pages = state.pages.map((p) =>
          p.selected === (p.id === id) ? p : { ...p, selected: p.id === id },
        );
        return { ...state, pages, lastSelectedId: id };
      }

      // range
      const from = state.pages.findIndex((p) => p.id === state.lastSelectedId);
      const to = state.pages.findIndex((p) => p.id === id);
      if (from === -1 || to === -1) return state;
      const [lo, hi] = from < to ? [from, to] : [to, from];
      const rangeIds = new Set(state.pages.slice(lo, hi + 1).map((p) => p.id));
      const pages = setSelection(state.pages, rangeIds, true);
      return { ...state, pages, lastSelectedId: id };
    }

    case 'SELECT_ALL':
      return {
        ...state,
        pages: state.pages.map((p) => (p.selected ? p : { ...p, selected: true })),
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        pages: state.pages.map((p) => (p.selected ? { ...p, selected: false } : p)),
      };

    case 'RESET':
      return { ...initialWorkspaceState };

    case 'LOADING_START':
      return { ...state, loadingCount: state.loadingCount + 1 };

    case 'LOADING_END':
      return { ...state, loadingCount: Math.max(0, state.loadingCount - 1) };

    case 'BUILD_START':
      return { ...state, building: true, buildProgress: { done: 0, total: state.pages.length } };

    case 'BUILD_PROGRESS':
      return { ...state, buildProgress: { done: action.done, total: action.total } };

    case 'BUILD_END':
      return { ...state, building: false, buildProgress: null };
  }
}