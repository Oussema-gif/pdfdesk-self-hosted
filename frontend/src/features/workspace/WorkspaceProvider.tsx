import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  loadPdf,
  releaseAllDocuments,
  releaseDocument,
  zipFileName as defaultZipName,
  type FileId,
  type PageId,
} from '../../lib/pdf';
import { useConfig } from '../../lib/config';
import { useToast } from '../../lib/toast';
import {
  WorkspaceContext,
  type ExportBuildOptions,
  type ExportPayload,
  type WorkspaceContextValue,
} from './context';
import { initialWorkspaceState, workspaceReducer, type WorkspaceState } from './state';
import { filterAcceptedFiles } from './fileDrop';
import { takePendingFiles } from './pendingFiles';

type Props = { children: ReactNode };

function downloadBlob(bytes: Uint8Array, name: string, mime: string): void {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function WorkspaceProvider({ children }: Props): JSX.Element {
  const { config } = useConfig();
  const toast = useToast();
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);

  const stateRef = useRef<WorkspaceState>(state);
  stateRef.current = state;

  const exportAbortRef = useRef<AbortController | null>(null);

  // If the user dropped files on the home page, load them once on mount.
  useEffect(() => {
    const files = takePendingFiles();
    if (files !== null) void addFiles(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const { accepted, rejected } = filterAcceptedFiles(files);

      for (const file of rejected) {
        toast.push({
          title: 'Skipped a file',
          description: `"${file.name}" is not a PDF.`,
          variant: 'error',
        });
      }
      if (accepted.length === 0) return;

      dispatch({ type: 'LOADING_START' });
      const loaded = [];
      for (const file of accepted) {
        try {
          const src = await loadPdf(file, { limits: config.limits });
          loaded.push(src);
        } catch (error) {
          const description =
            error instanceof Error ? error.message : 'The file could not be opened.';
          toast.push({ title: 'Cannot add file', description, variant: 'error' });
        }
      }
      if (loaded.length > 0) dispatch({ type: 'ADD_SOURCES', sources: loaded });
      dispatch({ type: 'LOADING_END' });
    },
    [config.limits, toast],
  );

  const removeSource = useCallback((fileId: FileId) => {
    releaseDocument(fileId);
    dispatch({ type: 'REMOVE_SOURCE', fileId });
  }, []);

  const rotateSelected = useCallback((delta: 90 | -90 | 180) => {
    const ids = new Set<PageId>();
    for (const p of stateRef.current.pages) if (p.selected) ids.add(p.id);
    if (ids.size === 0) return;
    dispatch({ type: 'ROTATE', ids, delta });
  }, []);

  const deleteSelected = useCallback(() => {
    const ids = new Set<PageId>();
    for (const p of stateRef.current.pages) if (p.selected) ids.add(p.id);
    if (ids.size === 0) return;
    dispatch({ type: 'REMOVE_PAGES', ids });
  }, []);

  const move = useCallback((from: number, to: number) => {
    dispatch({ type: 'MOVE', from, to });
  }, []);

  const selectPage = useCallback((id: PageId, mode: 'replace' | 'toggle' | 'range') => {
    dispatch({ type: 'SELECT', id, mode });
  }, []);

  const selectAll = useCallback(() => dispatch({ type: 'SELECT_ALL' }), []);
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);

  const reset = useCallback(() => {
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    releaseAllDocuments();
    dispatch({ type: 'RESET' });
  }, []);

  const cancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
  }, []);

  const runExport = useCallback(
    async (build: (opts: ExportBuildOptions) => Promise<ExportPayload>) => {
      const controller = new AbortController();
      exportAbortRef.current = controller;
      dispatch({ type: 'BUILD_START' });

      try {
        const payload = await build({
          signal: controller.signal,
          onProgress: (done, total) => dispatch({ type: 'BUILD_PROGRESS', done, total }),
        });

        if (payload.kind === 'single') {
          downloadBlob(payload.bytes, payload.name, payload.mime ?? 'application/pdf');
          toast.push({ title: 'Download ready', description: payload.name, variant: 'success' });
        } else {
          const { zipSync } = await import('fflate');
          const entries: Record<string, Uint8Array> = {};
          for (const file of payload.files) entries[file.name] = file.bytes;
          const zipBytes = zipSync(entries, { level: 6 });
          const zipName = payload.zipName || defaultZipName();
          downloadBlob(zipBytes, zipName, 'application/zip');
          toast.push({
            title: 'Download ready',
            description: `${zipName} · ${payload.files.length} files`,
            variant: 'success',
          });
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError';
        if (aborted) {
          toast.push({ title: 'Export cancelled', variant: 'info' });
        } else {
          toast.push({
            title: 'Export failed',
            description: error instanceof Error ? error.message : 'The PDF could not be created.',
            variant: 'error',
          });
        }
      } finally {
        if (exportAbortRef.current === controller) exportAbortRef.current = null;
        dispatch({ type: 'BUILD_END' });
      }
    },
    [toast],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      state,
      addFiles,
      removeSource,
      rotateSelected,
      deleteSelected,
      move,
      selectPage,
      selectAll,
      clearSelection,
      reset,
      runExport,
      cancelExport,
    }),
    [
      state,
      addFiles,
      removeSource,
      rotateSelected,
      deleteSelected,
      move,
      selectPage,
      selectAll,
      clearSelection,
      reset,
      runExport,
      cancelExport,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
