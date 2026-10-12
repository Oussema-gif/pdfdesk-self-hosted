import { useCallback } from 'react';
import { Download } from 'lucide-react';
import { WorkspaceProvider, WorkspaceView, useWorkspace } from '../features/workspace';
import { useTool } from '../features/tools';
import { buildPdf, mergedFileName } from '../lib/pdf';

export function MergeWorkspace(): JSX.Element {
  return (
    <WorkspaceProvider>
      <Inner />
    </WorkspaceProvider>
  );
}

function Inner(): JSX.Element {
  const tool = useTool('merge');
  return <WorkspaceView title={tool?.label ?? 'Merge'} actions={<MergeAction />} />;
}

function MergeAction(): JSX.Element {
  const { state, runExport } = useWorkspace();
  const canBuild = state.pages.length > 0;

  const onClick = useCallback(() => {
    const snapshot = state;
    void runExport(async ({ signal, onProgress }) => {
      const bytes = await buildPdf(snapshot.pages, snapshot.sources, {
        signal,
        onProgress,
      });
      return { kind: 'single', name: mergedFileName(), bytes };
    });
  }, [runExport, state]);

  return (
    <button
      type="button"
      disabled={!canBuild || state.building}
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
          <Download className="h-4 w-4" aria-hidden="true" /> Merge and download
        </>
      )}
    </button>
  );
}
