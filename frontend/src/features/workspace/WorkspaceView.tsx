import type { ReactNode } from 'react';
import { useWorkspace } from './useWorkspace';
import { DropZone } from './DropZone';
import { FileListPanel } from './FileListPanel';
import { PageGrid } from './PageGrid';
import { Toolbar } from './Toolbar';

type Props = {
  title: string;
  /** Rendered above the toolbar. Use for tool-specific controls. */
  panel?: ReactNode;
  /** Rendered in the toolbar's right slot as the primary action. */
  actions: ReactNode;
};

export function WorkspaceView({ title, panel, actions }: Props): JSX.Element {
  const { state } = useWorkspace();
  const hasPages = state.pages.length > 0;

  if (!hasPages) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {panel}
        <DropZone variant="hero" />
        <p className="mt-4 text-center text-xs text-text-secondary">
          Everything happens in your browser. Files never leave your device.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      {panel}
      <Toolbar title={title}>{actions}</Toolbar>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <FileListPanel />
          <div className="mt-3">
            <DropZone variant="compact" />
          </div>
        </aside>
        <section aria-label="Pages">
          <PageGrid />
        </section>
      </div>
    </div>
  );
}
