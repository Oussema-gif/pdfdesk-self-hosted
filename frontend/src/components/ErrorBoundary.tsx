import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: unknown };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[pdfdesk] unhandled render error', error, info.componentStack);
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface p-6">
        <div className="w-full max-w-md rounded-card border border-border bg-surface-raised p-6 shadow-soft">
          <h1 className="text-lg font-semibold text-text-primary">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            The workspace hit an unexpected error. Reloading usually clears it. Your files stay on
            your device — nothing was uploaded.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white shadow-soft transition-transform active:scale-[0.97]"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}