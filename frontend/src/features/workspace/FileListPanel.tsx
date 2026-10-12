import { FileText, X } from 'lucide-react';
import { useWorkspace } from './useWorkspace';

export function FileListPanel(): JSX.Element | null {
  const { state, removeSource } = useWorkspace();

  if (state.sources.size === 0) return null;

  return (
    <div className="rounded-card border border-border bg-surface-raised p-3 shadow-soft">
      <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
        Files
      </h2>
      <ul className="flex flex-col gap-1">
        {Array.from(state.sources.values()).map((source) => {
          const pageCount = state.pages.filter((p) => p.fileId === source.fileId).length;
          return (
            <li
              key={source.fileId}
              className="group flex items-center gap-2 rounded-control px-2 py-1.5 text-sm transition-colors hover:bg-surface"
            >
              <FileText className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-text-primary" title={source.fileName}>
                {source.fileName}
              </span>
              <span className="shrink-0 text-xs text-text-secondary">
                {pageCount} page{pageCount === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => removeSource(source.fileId)}
                className="shrink-0 rounded-full p-1 text-text-secondary transition-colors hover:bg-danger/10 hover:text-danger"
                aria-label={`Remove ${source.fileName}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}