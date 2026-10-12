import type { ReactNode } from 'react';
import { ArrowLeft, CheckSquare, RotateCcw, RotateCw, Square, Trash2, X } from 'lucide-react';
import { useWorkspace } from './useWorkspace';

type Props = {
  title: string;
  /** Rendered as the right-side primary action. */
  children: ReactNode;
};

export function Toolbar({ title, children }: Props): JSX.Element {
  const {
    state,
    selectAll,
    clearSelection,
    rotateSelected,
    deleteSelected,
    reset,
    cancelExport,
  } = useWorkspace();

  const selectionCount = state.pages.reduce((acc, p) => acc + (p.selected ? 1 : 0), 0);
  const hasSelection = selectionCount > 0;
  const hasPages = state.pages.length > 0;

  const progressLabel =
    state.buildProgress !== null
      ? `${state.buildProgress.done} / ${state.buildProgress.total}`
      : null;

  return (
    <div className="sticky top-14 z-20 -mx-4 mb-4 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-secondary shadow-soft transition-colors hover:text-text-primary"
          aria-label="Start over"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Start over
        </button>

        <span className="hidden text-sm font-medium text-text-primary sm:inline">{title}</span>

        <span className="ml-auto inline-flex items-center gap-2 text-xs text-text-secondary">
          {hasPages && (
            <>
              <span>
                {state.pages.length} page{state.pages.length === 1 ? '' : 's'}
              </span>
              {hasSelection && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{selectionCount} selected</span>
                </>
              )}
            </>
          )}
        </span>

        {hasPages && !state.building && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={hasSelection ? clearSelection : selectAll}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-secondary shadow-soft transition-colors hover:text-text-primary"
            >
              {hasSelection ? (
                <>
                  <Square className="h-4 w-4" aria-hidden="true" /> Deselect
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" aria-hidden="true" /> Select all
                </>
              )}
            </button>

            <button
              type="button"
              disabled={!hasSelection}
              onClick={() => rotateSelected(-90)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary shadow-soft transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Rotate selection left"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={!hasSelection}
              onClick={() => rotateSelected(90)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-text-secondary shadow-soft transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Rotate selection right"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={!hasSelection}
              onClick={deleteSelected}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised text-danger shadow-soft transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Delete selection"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {state.building && progressLabel !== null && (
          <span
            className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs text-text-secondary shadow-soft"
            role="status"
            aria-live="polite"
          >
            Working {progressLabel}
          </span>
        )}

        {children}

        {state.building && (
          <button
            type="button"
            onClick={cancelExport}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary shadow-soft transition-colors hover:text-danger"
            aria-label="Cancel export"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
