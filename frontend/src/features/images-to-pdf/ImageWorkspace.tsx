import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, FileImage, GripVertical, Trash2, X } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DEFAULT_MARGINS_MM,
  imagesToPdf,
  type Margins,
  type Orientation,
  type PageSizePreset,
} from '../../lib/pdf';
import { useConfig } from '../../lib/config';
import { useToast } from '../../lib/toast';
import { IMAGE_ACCEPT_ATTR, filterImageFiles } from '../workspace/imageFiles';

type Item = {
  id: string;
  name: string;
  bytes: Uint8Array;
  previewUrl: string;
  width: number;
  height: number;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function bytesFromFile(file: File): Promise<Uint8Array> {
  return file.arrayBuffer().then((buf) => new Uint8Array(buf));
}

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = url;
  });
}

export function ImageWorkspace(): JSX.Element {
  const { config } = useConfig();
  const toast = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [pageSize, setPageSize] = useState<PageSizePreset>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margins, setMargins] = useState<Margins>(DEFAULT_MARGINS_MM);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Track every object URL we've ever created so we can revoke them
  // exactly once, on unmount, regardless of add/remove/reorder.
  const urlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
      urls.clear();
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const { accepted, rejected } = filterImageFiles(files);
      for (const f of rejected) {
        toast.push({
          title: 'Skipped a file',
          description: `"${f.name}" is not a PNG or JPG.`,
          variant: 'error',
        });
      }
      const limitBytes = config.limits.maxFileSizeMb * 1024 * 1024;
      const next: Item[] = [];
      for (const file of accepted) {
        if (file.size > limitBytes) {
          toast.push({
            title: 'File too large',
            description: `"${file.name}" exceeds ${config.limits.maxFileSizeMb} MB.`,
            variant: 'error',
          });
          continue;
        }
        try {
          const bytes = await bytesFromFile(file);
          const previewUrl = URL.createObjectURL(file);
          urlsRef.current.add(previewUrl);
          const { width, height } = await imageDimensions(previewUrl);
          next.push({ id: newId(), name: file.name, bytes, previewUrl, width, height });
        } catch {
          toast.push({ title: 'Cannot add image', description: file.name, variant: 'error' });
        }
      }
      if (next.length > 0) setItems((prev) => [...prev, ...next]);
    },
    [config.limits.maxFileSizeMb, toast],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) {
        URL.revokeObjectURL(it.previewUrl);
        urlsRef.current.delete(it.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => {
      for (const it of prev) {
        URL.revokeObjectURL(it.previewUrl);
        urlsRef.current.delete(it.previewUrl);
      }
      return [];
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    setItems((prev) => {
      const from = prev.findIndex((p) => p.id === active.id);
      const to = prev.findIndex((p) => p.id === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  }, []);

  const canBuild = items.length > 0 && !building;

  const onBuild = useCallback(async () => {
    if (items.length === 0) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBuilding(true);
    setProgress({ done: 0, total: items.length });
    try {
      const bytes = await imagesToPdf(
        items.map((it) => ({ name: it.name, bytes: it.bytes })),
        {
          pageSize,
          orientation,
          marginsMm: margins,
          signal: controller.signal,
          onProgress: (done, total) => setProgress({ done, total }),
        },
      );
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'images.pdf';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.push({ title: 'Download ready', description: 'images.pdf', variant: 'success' });
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      if (aborted) toast.push({ title: 'Export cancelled', variant: 'info' });
      else
        toast.push({
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Could not build the PDF.',
          variant: 'error',
        });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBuilding(false);
      setProgress(null);
    }
  }, [items, margins, orientation, pageSize, toast]);

  const onCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const totalDimensions = useMemo(() => items.length, [items.length]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="mb-3 flex items-center gap-3 pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All tools
        </Link>
        <h1 className="text-sm font-medium text-text-primary">Images to PDF</h1>
      </div>

      <OptionsPanel
        pageSize={pageSize}
        onPageSize={setPageSize}
        orientation={orientation}
        onOrientation={setOrientation}
        margins={margins}
        onMargins={setMargins}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-text-secondary">
          {totalDimensions} image{totalDimensions === 1 ? '' : 's'}
        </span>
        <span className="ml-auto" />
        {items.length > 0 && !building && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-secondary shadow-soft transition-colors hover:text-text-primary"
          >
            <X className="h-4 w-4" aria-hidden="true" /> Clear
          </button>
        )}
        <button
          type="button"
          disabled={!canBuild}
          onClick={() => void onBuild()}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {building ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Building
              {progress !== null ? ` ${progress.done} / ${progress.total}` : '…'}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" /> Create PDF
            </>
          )}
        </button>
        {building && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary shadow-soft transition-colors hover:text-danger"
          >
            Cancel
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <ImageDrop onFiles={addFiles} />
      ) : (
        <>
          <ImageDrop onFiles={addFiles} compact />
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <ul
                className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                aria-label="Image grid"
              >
                {items.map((item, index) => (
                  <li key={item.id}>
                    <ImageCard item={item} index={index} onRemove={removeItem} />
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

function OptionsPanel(props: {
  pageSize: PageSizePreset;
  onPageSize: (v: PageSizePreset) => void;
  orientation: Orientation;
  onOrientation: (v: Orientation) => void;
  margins: Margins;
  onMargins: (v: Margins) => void;
}): JSX.Element {
  const { pageSize, onPageSize, orientation, onOrientation, margins, onMargins } = props;

  const updateMargin = (key: keyof Margins, value: number): void => {
    const n = Number.isFinite(value) ? value : 0;
    onMargins({ ...margins, [key]: Math.min(Math.max(n, 0), 50) });
  };

  return (
    <section
      aria-labelledby="images-options-heading"
      className="mb-4 rounded-card border border-border bg-surface-raised p-4 shadow-soft"
    >
      <h2
        id="images-options-heading"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        Page options
      </h2>

      <div className="flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Page size</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSize(e.target.value as PageSizePreset)}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Fit">Fit to image</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Orientation</span>
          <select
            value={orientation}
            onChange={(e) => onOrientation(e.target.value as Orientation)}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>

        <fieldset className="flex flex-wrap gap-3 border-0 p-0">
          <legend className="mb-1 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Margins (mm)
          </legend>
          {(['top', 'right', 'bottom', 'left'] as const).map((k) => (
            <label key={k} className="flex flex-col gap-1 text-sm">
              <span className="capitalize text-text-secondary">{k}</span>
              <input
                type="number"
                min={0}
                max={50}
                value={margins[k]}
                onChange={(e) => updateMargin(k, Number.parseFloat(e.target.value))}
                className="w-20 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
          ))}
        </fieldset>
      </div>
    </section>
  );
}

function ImageDrop({
  onFiles,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed transition-all ${
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-14'
      } ${dragging ? 'border-accent bg-accent-soft/40' : 'border-border bg-surface-raised/60 hover:border-text-secondary/50'}`}
      aria-label="Add images"
    >
      <span
        className={`inline-flex items-center justify-center rounded-full bg-accent-soft text-accent ${
          compact ? 'h-9 w-9' : 'h-12 w-12'
        }`}
        aria-hidden="true"
      >
        <FileImage className={compact ? 'h-4 w-4' : 'h-6 w-6'} />
      </span>
      <span className={`font-medium text-text-primary ${compact ? 'text-sm' : 'text-base'}`}>
        {dragging ? 'Release to add' : 'Drop images here'}
      </span>
      <span className={`text-text-secondary ${compact ? 'text-xs' : 'text-sm'}`}>
        PNG or JPG · or click to browse
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        multiple
        onChange={(e) => {
          const list = e.target.files;
          if (list !== null) onFiles(Array.from(list));
          e.target.value = '';
        }}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

function ImageCard({
  item,
  index,
  onRemove,
}: {
  item: Item;
  index: number;
  onRemove: (id: string) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-soft transition-all ${
        isDragging ? 'opacity-60 shadow-lift' : 'hover:-translate-y-0.5 hover:shadow-lift'
      }`}
    >
      <div className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-surface-raised/95 px-2 py-0.5 text-xs font-medium text-text-primary shadow-soft">
        <GripVertical className="h-3 w-3 text-text-secondary" aria-hidden="true" />
        <span>{index + 1}</span>
      </div>
      <div className="flex items-center justify-center bg-surface p-3">
        <img
          src={item.previewUrl}
          alt={item.name}
          className="max-h-40 max-w-full rounded-md shadow-soft"
        />
      </div>
      <div className="truncate px-2 pb-2 text-xs text-text-secondary" title={item.name}>
        {item.name}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised/95 text-danger shadow-soft transition-colors hover:bg-danger/10"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
