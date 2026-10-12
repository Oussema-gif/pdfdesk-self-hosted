import { useMemo } from 'react';
import { parseRanges, countRangePages, chunkRanges } from '../../lib/pdf';
import { useWorkspace } from './useWorkspace';

export type SplitMode = 'ranges' | 'everyN';

export type SplitPanelProps = {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  rangesInput: string;
  onRangesChange: (value: string) => void;
  everyN: number;
  onEveryNChange: (value: number) => void;
};

export function SplitPanel(props: SplitPanelProps): JSX.Element {
  const { mode, onModeChange, rangesInput, onRangesChange, everyN, onEveryNChange } = props;
  const { state } = useWorkspace();
  const totalPages = state.pages.length;

  const validation = useMemo(() => {
    if (mode !== 'ranges') return null;
    const parsed = parseRanges(rangesInput, totalPages);
    if (!parsed.ok) return { ok: false as const, error: parsed.error };
    const pages = countRangePages(parsed.ranges);
    if (parsed.ranges.length === 0) {
      return { ok: false as const, error: 'Enter at least one range, e.g. 1-3, 5.' };
    }
    return {
      ok: true as const,
      chunks: parsed.ranges.length,
      pages,
    };
  }, [mode, rangesInput, totalPages]);

  const everyNPreview = useMemo(() => {
    if (mode !== 'everyN') return null;
    const ranges = chunkRanges(totalPages, everyN);
    return { chunks: ranges.length, pages: totalPages };
  }, [mode, everyN, totalPages]);

  return (
    <section
      aria-labelledby="split-panel-heading"
      className="mb-4 rounded-card border border-border bg-surface-raised p-4 shadow-soft"
    >
      <h2
        id="split-panel-heading"
        className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary"
      >
        Split options
      </h2>

      <fieldset className="flex flex-col gap-3 border-0 p-0">
        <legend className="sr-only">Choose how to split the current page list</legend>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="radio"
            name="split-mode"
            value="ranges"
            checked={mode === 'ranges'}
            onChange={() => onModeChange('ranges')}
          />
          <span>By ranges</span>
        </label>

        {mode === 'ranges' && (
          <div className="ml-6 flex flex-col gap-2">
            <label htmlFor="split-ranges" className="text-sm text-text-secondary">
              Ranges (comma separated, 1-based)
            </label>
            <input
              id="split-ranges"
              type="text"
              inputMode="numeric"
              placeholder="1-3, 5, 8-10"
              value={rangesInput}
              onChange={(e) => onRangesChange(e.target.value)}
              className="w-full rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <p
              className={`text-xs ${validation?.ok === false ? 'text-danger' : 'text-text-secondary'}`}
              aria-live="polite"
            >
              {validation === null
                ? ''
                : validation.ok
                  ? `${validation.chunks} output${validation.chunks === 1 ? '' : 's'} · ${validation.pages} page${validation.pages === 1 ? '' : 's'} total`
                  : validation.error}
            </p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="radio"
            name="split-mode"
            value="everyN"
            checked={mode === 'everyN'}
            onChange={() => onModeChange('everyN')}
          />
          <span>Every N pages</span>
        </label>

        {mode === 'everyN' && (
          <div className="ml-6 flex flex-col gap-2">
            <label htmlFor="split-every-n" className="text-sm text-text-secondary">
              Chunk size
            </label>
            <input
              id="split-every-n"
              type="number"
              min={1}
              max={Math.max(1, totalPages)}
              value={everyN}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                onEveryNChange(Number.isFinite(n) && n >= 1 ? n : 1);
              }}
              className="w-24 rounded-control border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-soft outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <p className="text-xs text-text-secondary" aria-live="polite">
              {everyNPreview
                ? `${everyNPreview.chunks} output${everyNPreview.chunks === 1 ? '' : 's'} · ${everyNPreview.pages} page${everyNPreview.pages === 1 ? '' : 's'} total`
                : ''}
            </p>
          </div>
        )}
      </fieldset>
    </section>
  );
}
