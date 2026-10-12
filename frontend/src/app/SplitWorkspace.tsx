import { useCallback, useState } from 'react';
import { CheckSquare, Download } from 'lucide-react';
import {
  WorkspaceProvider,
  WorkspaceView,
  useWorkspace,
  SplitPanel,
  type SplitMode,
} from '../features/workspace';
import { useTool } from '../features/tools';
import {
  chunkRanges,
  countRangePages,
  parseRanges,
  splitByRanges,
  zipFileName,
  type PageRange,
} from '../lib/pdf';

export function SplitWorkspace(): JSX.Element {
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [rangesInput, setRangesInput] = useState('');
  const [everyN, setEveryN] = useState(2);

  return (
    <WorkspaceProvider>
      <Inner
        mode={mode}
        onModeChange={setMode}
        rangesInput={rangesInput}
        onRangesChange={setRangesInput}
        everyN={everyN}
        onEveryNChange={setEveryN}
      />
    </WorkspaceProvider>
  );
}

type InnerProps = {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  rangesInput: string;
  onRangesChange: (value: string) => void;
  everyN: number;
  onEveryNChange: (value: number) => void;
};

function Inner(props: InnerProps): JSX.Element {
  const tool = useTool('split');
  return (
    <WorkspaceView
      title={tool?.label ?? 'Split & extract'}
      panel={<SplitPanel {...props} />}
      actions={<SplitActions {...props} />}
    />
  );
}

function SplitActions(props: InnerProps): JSX.Element {
  const { mode, rangesInput, everyN } = props;
  const { state, runExport } = useWorkspace();

  const totalPages = state.pages.length;
  const hasPages = totalPages > 0;

  const rangesValid =
    mode === 'ranges' &&
    hasPages &&
    (() => {
      const parsed = parseRanges(rangesInput, totalPages);
      return parsed.ok && parsed.ranges.length > 0;
    })();

  const canSplit = hasPages && (mode === 'everyN' ? totalPages >= 1 : rangesValid);

  const baseName = guessBaseName(state);

  const onSplit = useCallback(() => {
    const snapshot = state;
    const ranges: PageRange[] =
      mode === 'everyN'
        ? chunkRanges(snapshot.pages.length, everyN)
        : (() => {
            const parsed = parseRanges(rangesInput, snapshot.pages.length);
            return parsed.ok ? parsed.ranges : [];
          })();

    if (ranges.length === 0) return;

    void runExport(async ({ signal, onProgress }) => {
      const outputs = await splitByRanges(snapshot.pages, snapshot.sources, ranges, baseName, {
        signal,
        onProgress,
      });
      if (outputs.length === 1) {
        const only = outputs[0]!;
        return { kind: 'single', name: only.name, bytes: only.bytes };
      }
      return { kind: 'multi', zipName: zipFileName(), files: outputs };
    });
  }, [baseName, everyN, mode, rangesInput, runExport, state]);

  const onExtractSelected = useCallback(() => {
    const snapshot = state;
    const selected = snapshot.pages.filter((p) => p.selected);
    if (selected.length === 0) return;

    void runExport(async ({ signal, onProgress }) => {
      const bytes = await import('../lib/pdf').then(({ buildPdf }) =>
        buildPdf(selected, snapshot.sources, { signal, onProgress }),
      );
      const name = `${baseName}-selected.pdf`;
      return { kind: 'single', name, bytes };
    });
  }, [baseName, runExport, state]);

  const selectionCount = state.pages.reduce((acc, p) => acc + (p.selected ? 1 : 0), 0);

  return (
    <>
      <button
        type="button"
        disabled={!canSplit || state.building}
        onClick={onSplit}
        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state.building ? (
          <>
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Building…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" /> Split and download
          </>
        )}
      </button>

      {selectionCount > 0 && (
        <button
          type="button"
          disabled={state.building}
          onClick={onExtractSelected}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary shadow-soft transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckSquare className="h-4 w-4" aria-hidden="true" />
          Extract {selectionCount} selected
        </button>
      )}
    </>
  );
}

function guessBaseName(state: { pages: { fileId: string }[]; sources: Map<string, { fileName: string }> }): string {
  const first = state.pages[0];
  if (!first) return 'document';
  const src = state.sources.get(first.fileId);
  if (!src) return 'document';
  return src.fileName.replace(/\.[^.]+$/, '');
}

// Keep this export referenced so consumers of the barrel still see it.
void countRangePages;
