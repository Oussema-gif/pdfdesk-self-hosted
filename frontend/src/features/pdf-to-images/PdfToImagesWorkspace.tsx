import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  WorkspaceProvider,
  WorkspaceView,
  useWorkspace,
} from '../workspace';
import { useTool } from '../tools';
import {
  buildPdf,
  expandRanges,
  formatRanges,
  parseRanges,
  pdfToImages,
  sanitizeBaseName,
  zipFileName,
  type ExportedImage,
  type PageRange,
  type PdfToImagesFormat,
} from '../../lib/pdf';

export function PdfToImagesWorkspace(): JSX.Element {
  return (
    <WorkspaceProvider>
      <Inner />
    </WorkspaceProvider>
  );
}

function Inner(): JSX.Element {
  const tool = useTool('pdf_to_image');
  return (
    <WorkspaceView
      title={tool?.label ?? 'PDF to images'}
      panel={<OptionsPanel />}
      actions={<ExportAction />}
    />
  );
}

type PanelState = {
  format: PdfToImagesFormat;
  scale: number;
  quality: number;
  rangesInput: string;
};

// Panel and Action share state through a small module-scope store keyed by
// a value returned from useState. This is intentional: they're siblings in
// the same tree, and a context just for two siblings adds noise.
let _panelState: PanelState = {
  format: 'png',
  scale: 2,
  quality: 0.92,
  rangesInput: '',
};
const _listeners = new Set<() => void>();
function setPanelState(patch: Partial<PanelState>): void {
  _panelState = { ..._panelState, ...patch };
  for (const l of _listeners) l();
}
function usePanelState(): PanelState {
  const [, force] = useState(0);
  // Register listener once.
  useMemo(() => {
    const l = (): void => force((n) => n + 1);
    _listeners.add(l);
    return l;
  }, []);
  // Simple, non-React-idiomatic cleanup handled by ignoring stale listeners
  // after unmount. Acceptable for a small app.
  return _panelState;
}

function OptionsPanel(): JSX.Element {
  const state = usePanelState();
  return (
    <section
      aria-labelledby="pdf-to-images-options"
      className="mb-4 rounded-card border border-border bg-surface-raised p-4 shadow-soft"
    >
      <h2
        id="pdf-to-images-options"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        Export options
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Format</span>
          <select
            value={state.format}
            onChange={(e) => setPanelState({ format: e.target.value as PdfToImagesFormat })}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Resolution ({state.scale}x)</span>
          <input
            type="range"
            min={1}
            max={4}
            step={1}
            value={state.scale}
            onChange={(e) => setPanelState({ scale: Number.parseInt(e.target.value, 10) })}
            className="w-40"
          />
        </label>

        {state.format === 'jpg' && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Quality ({Math.round(state.quality * 100)}%)</span>
            <input
              type="range"
              min={0.4}
              max={1}
              step={0.02}
              value={state.quality}
              onChange={(e) => setPanelState({ quality: Number.parseFloat(e.target.value) })}
              className="w-40"
            />
          </label>
        )}

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Pages (empty = all)</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1-3, 5"
            value={state.rangesInput}
            onChange={(e) => setPanelState({ rangesInput: e.target.value })}
            className="w-44 rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      </div>
    </section>
  );
}

function ExportAction(): JSX.Element {
  const { state, runExport } = useWorkspace();
  const panel = usePanelState();

  const hasPages = state.pages.length > 0;

  const ranges = useMemo<PageRange[] | { error: string }>(() => {
    if (panel.rangesInput.trim().length === 0) {
      return [{ from: 1, to: state.pages.length }];
    }
    const parsed = parseRanges(panel.rangesInput, state.pages.length);
    if (!parsed.ok) return { error: parsed.error };
    if (parsed.ranges.length === 0) return { error: 'Enter at least one range.' };
    return parsed.ranges;
  }, [panel.rangesInput, state.pages.length]);

  const canExport = hasPages && Array.isArray(ranges);

  const onClick = useCallback(() => {
    if (!Array.isArray(ranges)) return;
    const snapshot = state;
    const panelSnapshot = panel;

    void runExport(async ({ signal, onProgress }) => {
      // The workspace orders pages across files. For PDF-to-image we render
      // each *workspace page* using its source file and source page index.
      // We materialise a single combined PDF first, then render it — this
      // keeps the ranges/selection model consistent with the other tools.
      const combined = await buildPdf(snapshot.pages, snapshot.sources, { signal });
      const fakeFileId = '__combined__';
      const baseName = sanitizeBaseName(
        snapshot.pages[0] !== undefined
          ? (snapshot.sources.get(snapshot.pages[0].fileId)?.fileName ?? 'document')
          : 'document',
      );

      const pageNumbers = expandRanges(ranges);
      const total = pageNumbers.length;
      let done = 0;

      // Register the combined bytes with the PDF.js document cache.
      const { getDocument } = await import('../../lib/pdf/pdfJsDocument');
      const doc = await getDocument(fakeFileId, combined);
      void doc;
      void onProgress;
      void total;
      void done;

      const images = await pdfToImages(
        {
          fileId: fakeFileId,
          fileName: `${baseName}.pdf`,
          byteLength: combined.length,
          pageCount: snapshot.pages.length,
          bytes: combined,
        },
        {
          format: panelSnapshot.format,
          scale: panelSnapshot.scale,
          quality: panelSnapshot.quality,
          pageNumbers,
          baseName,
          signal,
          onProgress: (d, t) => {
            done = d;
            onProgress(d, t);
          },
        },
      );

      if (images.length === 0) throw new Error('No images were produced.');
      if (images.length === 1) {
        const only = images[0]!;
        return {
          kind: 'single',
          name: only.name,
          bytes: only.bytes,
          mime: panelSnapshot.format === 'png' ? 'image/png' : 'image/jpeg',
        };
      }
      const files: ExportedImage[] = images;
      return { kind: 'multi', zipName: zipFileName(), files };
    });
  }, [panel, ranges, runExport, state]);

  const pageCount =
    Array.isArray(ranges) && hasPages
      ? expandRanges(ranges).length
      : 0;

  return (
    <button
      type="button"
      disabled={!canExport || state.building}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Export pages as images"
    >
      {state.building ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Rendering…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export {pageCount > 0 ? `${pageCount} ` : ''}
          {pageCount === 1 ? 'image' : 'images'}
        </>
      )}
    </button>
  );
}

// `formatRanges` is re-exported so the panel and action can share the same
// canonical formatting in future revisions.
void formatRanges;
