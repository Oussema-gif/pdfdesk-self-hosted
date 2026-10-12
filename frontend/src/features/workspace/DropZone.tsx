import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import { useWorkspace } from './useWorkspace';
import { ACCEPT_ATTR, filesFromDataTransfer } from './fileDrop';

type Props = {
  /** "hero" for the home-style centred zone, "compact" for a top strip. */
  variant?: 'hero' | 'compact';
};

export function DropZone({ variant = 'hero' }: Props): JSX.Element {
  const { addFiles, state } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const files = filesFromDataTransfer(event.dataTransfer);
      void addFiles(files);
    },
    [addFiles],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dragging) setDragging(true);
  }, [dragging]);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    // Only reset when the pointer actually leaves the zone, not when it moves
    // between children.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  }, []);

  const onPick = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list === null) return;
      void addFiles(Array.from(list));
      event.target.value = '';
    },
    [addFiles],
  );

  const baseClasses =
    'relative flex w-full cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed transition-all';
  const sizeClasses =
    variant === 'hero'
      ? 'gap-3 px-6 py-14 text-center sm:py-20'
      : 'gap-2 px-4 py-6 text-center';
  const stateClasses = dragging
    ? 'border-accent bg-accent-soft/40 scale-[1.005]'
    : 'border-border bg-surface-raised/60 hover:border-text-secondary/50';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPick();
        }
      }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      className={`${baseClasses} ${sizeClasses} ${stateClasses}`}
      aria-label="Add PDF files"
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-accent-soft text-accent ${
          variant === 'hero' ? 'h-12 w-12' : 'h-9 w-9'
        }`}
        aria-hidden="true"
      >
        <FileUp className={variant === 'hero' ? 'h-6 w-6' : 'h-4 w-4'} />
      </span>
      <span
        className={`font-medium text-text-primary ${
          variant === 'hero' ? 'text-base' : 'text-sm'
        }`}
      >
        {dragging ? 'Release to add' : 'Drop PDFs here'}
      </span>
      <span className={`text-text-secondary ${variant === 'hero' ? 'text-sm' : 'text-xs'}`}>
        or click to browse
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        onChange={onInputChange}
        className="sr-only"
        tabIndex={-1}
      />
      {state.loadingCount > 0 && (
        <span
          className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-surface-raised px-2.5 py-1 text-xs text-text-secondary shadow-soft"
          aria-live="polite"
        >
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent" />
          Loading…
        </span>
      )}
    </div>
  );
}