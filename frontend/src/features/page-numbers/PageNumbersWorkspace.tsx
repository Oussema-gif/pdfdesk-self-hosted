import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  WorkspaceProvider,
  WorkspaceView,
  useWorkspace,
} from '../workspace';
import { useTool } from '../tools';
import {
  DEFAULT_PAGE_NUMBERS,
  pageNumbers,
  type PageNumberFormat,
  type PageNumberPosition,
} from '../../lib/pdf';

export function PageNumbersWorkspace(): JSX.Element {
  return (
    <WorkspaceProvider>
      <WorkspaceView
        title={useTool('page_numbers')?.label ?? 'Page numbers'}
        panel={<Panel />}
        actions={<Action />}
      />
    </WorkspaceProvider>
  );
}

type PanelState = {
  position: PageNumberPosition;
  format: PageNumberFormat;
  startNumber: number;
  skipFirstPage: boolean;
  fontSize: number;
  margin: number;
};

let _s: PanelState = {
  position: DEFAULT_PAGE_NUMBERS.position,
  format: DEFAULT_PAGE_NUMBERS.format,
  startNumber: DEFAULT_PAGE_NUMBERS.startNumber,
  skipFirstPage: DEFAULT_PAGE_NUMBERS.skipFirstPage,
  fontSize: DEFAULT_PAGE_NUMBERS.fontSize,
  margin: DEFAULT_PAGE_NUMBERS.margin,
};
const _ls = new Set<() => void>();
function setS(patch: Partial<PanelState>): void {
  _s = { ..._s, ...patch };
  for (const l of _ls) l();
}
function useS(): PanelState {
  const [, force] = useState(0);
  useMemo(() => {
    const l = (): void => force((n) => n + 1);
    _ls.add(l);
    return l;
  }, []);
  return _s;
}

function Panel(): JSX.Element {
  const s = useS();
  const positions: PageNumberPosition[] = [
    'bottom-left',
    'bottom-center',
    'bottom-right',
    'top-left',
    'top-center',
    'top-right',
  ];
  return (
    <section
      aria-labelledby="page-numbers-options"
      className="mb-4 rounded-card border border-border bg-surface-raised p-4 shadow-soft"
    >
      <h2
        id="page-numbers-options"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        Page number options
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Position</span>
          <select
            value={s.position}
            onChange={(e) => setS({ position: e.target.value as PageNumberPosition })}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {positions.map((p) => (
              <option key={p} value={p}>
                {p.replace('-', ' ')}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Format</span>
          <select
            value={s.format}
            onChange={(e) => setS({ format: e.target.value as PageNumberFormat })}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="plain">1</option>
            <option value="page-n">Page 1</option>
            <option value="page-n-of-total">Page 1 of N</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Start at</span>
          <input
            type="number"
            min={1}
            value={s.startNumber}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setS({ startNumber: Number.isFinite(n) && n >= 1 ? n : 1 });
            }}
            className="w-20 rounded-control border border-border bg-surface px-2 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Font size ({s.fontSize})</span>
          <input
            type="range"
            min={8}
            max={24}
            step={1}
            value={s.fontSize}
            onChange={(e) => setS({ fontSize: Number.parseInt(e.target.value, 10) })}
            className="w-32"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Margin ({s.margin}pt)</span>
          <input
            type="range"
            min={8}
            max={72}
            step={2}
            value={s.margin}
            onChange={(e) => setS({ margin: Number.parseInt(e.target.value, 10) })}
            className="w-32"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={s.skipFirstPage}
            onChange={(e) => setS({ skipFirstPage: e.target.checked })}
          />
          <span>Skip first page</span>
        </label>
      </div>
    </section>
  );
}

function Action(): JSX.Element {
  const { state, runExport } = useWorkspace();
  const s = useS();
  const hasPages = state.pages.length > 0;

  const onClick = useCallback(() => {
    if (!hasPages) return;
    const snapshot = state;
    const panel = s;

    void runExport(async ({ signal, onProgress }) => {
      const bytes = await pageNumbers(snapshot.pages, snapshot.sources, {
        position: panel.position,
        format: panel.format,
        startNumber: panel.startNumber,
        skipFirstPage: panel.skipFirstPage,
        fontSize: panel.fontSize,
        margin: panel.margin,
        color: DEFAULT_PAGE_NUMBERS.color,
        signal,
        onProgress,
      });
      return { kind: 'single', name: 'numbered.pdf', bytes };
    });
  }, [hasPages, runExport, s, state]);

  return (
    <button
      type="button"
      disabled={!hasPages || state.building}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {state.building ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          Building…
        </>
      ) : (
        <>
          <Download className="h-4 w-4" aria-hidden="true" /> Apply and download
        </>
      )}
    </button>
  );
}
