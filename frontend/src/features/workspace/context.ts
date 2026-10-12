import { createContext } from 'react';
import type { FileId, PageId } from '../../lib/pdf';
import type { WorkspaceState } from './state';

/** Payload a tool builds and hands to `runExport`. */
export type ExportPayload =
  | { kind: 'single'; name: string; bytes: Uint8Array; mime?: string }
  | { kind: 'multi'; zipName: string; files: Array<{ name: string; bytes: Uint8Array }> };

export type ExportBuildOptions = {
  signal: AbortSignal;
  onProgress: (done: number, total: number) => void;
};

export type WorkspaceContextValue = {
  state: WorkspaceState;
  addFiles: (files: File[]) => Promise<void>;
  removeSource: (fileId: FileId) => void;
  rotateSelected: (delta: 90 | -90 | 180) => void;
  deleteSelected: () => void;
  move: (from: number, to: number) => void;
  selectPage: (id: PageId, mode: 'replace' | 'toggle' | 'range') => void;
  selectAll: () => void;
  clearSelection: () => void;
  reset: () => void;
  /** Runs a build, shows progress, handles cancel and download. */
  runExport: (build: (opts: ExportBuildOptions) => Promise<ExportPayload>) => Promise<void>;
  cancelExport: () => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
