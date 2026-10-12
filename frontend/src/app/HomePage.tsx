import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp } from 'lucide-react';
import { ToolPicker } from '../features/tools';
import { useConfig } from '../lib/config';
import { setPendingFiles } from '../features/workspace/pendingFiles';

const ACCEPT_ATTR = 'application/pdf,.pdf';

export function HomePage(): JSX.Element {
  const { config } = useConfig();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const goWithFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      setPendingFiles(files);
      navigate('/tool/merge');
    },
    [navigate],
  );

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragging(false);
      const items = event.dataTransfer.items;
      const files: File[] = [];
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.kind !== 'file') continue;
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      } else {
        for (const f of Array.from(event.dataTransfer.files)) files.push(f);
      }
      goWithFiles(files);
    },
    [goWithFiles],
  );

  const onDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!dragging) setDragging(true);
    },
    [dragging],
  );

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  }, []);

  const onPick = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (list !== null) goWithFiles(Array.from(list));
      event.target.value = '';
    },
    [goWithFiles],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          A PDF workspace that stays on your device
        </h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          Every page you work on is processed in your browser. Nothing is uploaded. Configure your
          files, rearrange pages, and export — all without an account.
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl">
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
          aria-label="Add PDF files to start"
          className={`flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed px-6 py-14 text-center transition-all sm:py-20 ${
            dragging
              ? 'border-accent bg-accent-soft/40 scale-[1.005]'
              : 'border-border bg-surface-raised/60 hover:border-text-secondary/50'
          }`}
        >
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"
            aria-hidden="true"
          >
            <FileUp className="h-6 w-6" />
          </span>
          <span className="text-base font-medium text-text-primary">
            {dragging ? 'Release to add' : 'Drop PDFs here'}
          </span>
          <span className="text-sm text-text-secondary">
            or click to browse — you'll land in the merge tool
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
        </div>
      </div>

      <section className="mt-12" aria-labelledby="tools-heading">
        <h2
          id="tools-heading"
          className="mb-4 text-sm font-medium uppercase tracking-wider text-text-secondary"
        >
          Tools
        </h2>
        <ToolPicker />
      </section>

      <p className="mt-10 text-center text-xs text-text-secondary">
        {config.appName} · files never leave your browser
      </p>
    </div>
  );
}
