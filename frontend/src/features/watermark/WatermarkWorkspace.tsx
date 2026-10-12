import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  WorkspaceProvider,
  WorkspaceView,
  useWorkspace,
} from '../workspace';
import { useTool } from '../tools';
import {
  DEFAULT_WATERMARK,
  selectedIds,
  watermark,
  type WatermarkPosition,
} from '../../lib/pdf';
import { useToast } from '../../lib/toast';

export function WatermarkWorkspace(): JSX.Element {
  return (
    <WorkspaceProvider>
      <Inner />
    </WorkspaceProvider>
  );
}

function Inner(): JSX.Element {
  const tool = useTool('watermark');
  return (
    <WorkspaceView
      title={tool?.label ?? 'Watermark'}
      panel={<WatermarkPanel />}
      actions={<WatermarkAction />}
    />
  );
}

type PanelState = {
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  position: WatermarkPosition;
  useSelection: boolean;
};

let _s: PanelState = {
  text: DEFAULT_WATERMARK.text,
  fontSize: DEFAULT_WATERMARK.fontSize,
  opacity: DEFAULT_WATERMARK.opacity,
  rotation: DEFAULT_WATERMARK.rotation,
  position: DEFAULT_WATERMARK.position,
  useSelection: false,
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

function WatermarkPanel(): JSX.Element {
  const s = useS();
  return (
    <section
      aria-labelledby="watermark-options"
      className="mb-4 rounded-card border border-border bg-surface-raised p-4 shadow-soft"
    >
      <h2
        id="watermark-options"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        Watermark options
      </h2>
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Text</span>
          <input
            id="watermark-text"
            type="text"
            value={s.text}
            onChange={(e) => setS({ text: e.target.value })}
            className="w-56 rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Position</span>
          <select
            value={s.position}
            onChange={(e) => setS({ position: e.target.value as WatermarkPosition })}
            className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="diagonal">Diagonal</option>
            <option value="center">Center</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Font size ({s.fontSize})</span>
          <input
            type="range"
            min={12}
            max={120}
            step={2}
            value={s.fontSize}
            onChange={(e) => setS({ fontSize: Number.parseInt(e.target.value, 10) })}
            className="w-40"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-secondary">Opacity ({Math.round(s.opacity * 100)}%)</span>
          <input
            type="range"
            min={0.03}
            max={1}
            step={0.01}
            value={s.opacity}
            onChange={(e) => setS({ opacity: Number.parseFloat(e.target.value) })}
            className="w-40"
          />
        </label>

        {s.position === 'center' && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-secondary">Rotation ({s.rotation}°)</span>
            <input
              type="range"
              min={-90}
              max={90}
              step={5}
              value={s.rotation}
              onChange={(e) => setS({ rotation: Number.parseInt(e.target.value, 10) })}
              className="w-40"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={s.useSelection}
            onChange={(e) => setS({ useSelection: e.target.checked })}
          />
          <span>Only selected pages</span>
        </label>
      </div>
    </section>
  );
}

function WatermarkAction(): JSX.Element {
  const { state, runExport } = useWorkspace();
  const toast = useToast();
  const s = useS();

  const hasPages = state.pages.length > 0;
  const selected = useMemo(() => selectedIds(state.pages), [state.pages]);
  const canApply =
    hasPages && s.text.trim().length > 0 && (!s.useSelection || selected.size > 0);

  const onClick = useCallback(() => {
    if (!canApply) return;
    const snapshot = state;
    const panel = s;

    void runExport(async ({ signal, onProgress }) => {
      const appliesTo: 'all' | ReadonlySet<string> = panel.useSelection
        ? new Set(selected)
        : 'all';

      const bytes = await watermark(snapshot.pages, snapshot.sources, {
        text: panel.text,
        fontSize: panel.fontSize,
        opacity: panel.opacity,
        rotation: panel.rotation,
        position: panel.position,
        color: DEFAULT_WATERMARK.color,
        appliesTo,
        signal,
        onProgress,
      });

      return { kind: 'single', name: 'watermarked.pdf', bytes };
    }).catch(() => {
      toast.push({ title: 'Watermark failed', variant: 'error' });
    });
  }, [canApply, runExport, s, selected, state, toast]);

  return (
    <button
      type="button"
      disabled={!canApply || state.building}
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
