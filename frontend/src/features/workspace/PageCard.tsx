import { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import type { PageItem } from '../../lib/pdf';
import { useWorkspace } from './useWorkspace';
import { Thumbnail } from './Thumbnail';

type Props = {
  page: PageItem;
  index: number;
  bytes: Uint8Array;
  sourceName: string;
};

export function PageCard({ page, index, bytes, sourceName }: Props): JSX.Element {
  const { selectPage, rotateSelected, deleteSelected } = useWorkspace();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const mode = event.shiftKey
        ? 'range'
        : event.metaKey || event.ctrlKey
          ? 'toggle'
          : 'replace';
      selectPage(page.id, mode);
    },
    [page.id, selectPage],
  );

  const handleRotateLeft = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!page.selected) selectPage(page.id, 'replace');
      queueMicrotask(() => rotateSelected(-90));
    },
    [page.id, page.selected, rotateSelected, selectPage],
  );

  const handleRotateRight = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!page.selected) selectPage(page.id, 'replace');
      queueMicrotask(() => rotateSelected(90));
    },
    [page.id, page.selected, rotateSelected, selectPage],
  );

  const handleDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (!page.selected) selectPage(page.id, 'replace');
      queueMicrotask(() => deleteSelected());
    },
    [page.id, page.selected, deleteSelected, selectPage],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-pressed={page.selected}
      aria-label={`Page ${index + 1} of ${sourceName}${page.selected ? ', selected' : ''}`}
      onClick={onClick}
      className={`group relative flex flex-col overflow-hidden rounded-card border bg-surface-raised shadow-soft transition-all ${
        page.selected ? 'border-accent ring-2 ring-accent' : 'border-border'
      } ${isDragging ? 'opacity-60 shadow-lift' : 'hover:-translate-y-0.5 hover:shadow-lift'}`}
    >
      <div className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-surface-raised/95 px-2 py-0.5 text-xs font-medium text-text-primary shadow-soft">
        <GripVertical className="h-3 w-3 text-text-secondary" aria-hidden="true" />
        <span>{index + 1}</span>
      </div>

      <div className="flex items-center justify-center bg-surface p-3">
        <Thumbnail
          fileId={page.fileId}
          bytes={bytes}
          pageIndex={page.pageIndex}
          rotation={page.rotation}
          maxWidth={220}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-1 justify-center gap-1 p-2 opacity-0 transition-all group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={handleRotateLeft}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised/95 text-text-secondary shadow-soft transition-colors hover:text-text-primary"
          aria-label={`Rotate page ${index + 1} left`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRotateRight}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised/95 text-text-secondary shadow-soft transition-colors hover:text-text-primary"
          aria-label={`Rotate page ${index + 1} right`}
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised/95 text-danger shadow-soft transition-colors hover:bg-danger/10"
          aria-label={`Delete page ${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
