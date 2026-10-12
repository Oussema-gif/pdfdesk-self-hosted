import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ToastContext, type ToastContextValue } from './context';
import type { ToastInput, ToastItem } from './types';

type Props = { children: ReactNode };

const DEFAULT_DURATION_MS = 5000;

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function ToastProvider({ children }: Props): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const clearTimer = useCallback((id: string) => {
    const handle = timers.current.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer],
  );

  const scheduleDismiss = useCallback(
    (id: string, durationMs: number) => {
      if (durationMs <= 0) return;
      const handle = window.setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, handle);
    },
    [dismiss],
  );

  const push = useCallback(
    (input: ToastInput) => {
      const id = newId();
      const item: ToastItem = {
        id,
        title: input.title,
        variant: input.variant ?? 'info',
        durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
        ...(input.description !== undefined ? { description: input.description } : {}),
      };
      setItems((prev) => [...prev, item]);
      scheduleDismiss(id, item.durationMs);
      return id;
    },
    [scheduleDismiss],
  );

  const clear = useCallback(() => {
    for (const id of timers.current.keys()) clearTimer(id);
    setItems([]);
  }, [clearTimer]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const handle of map.values()) window.clearTimeout(handle);
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ push, dismiss, clear }), [push, dismiss, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      <div aria-live="polite" aria-atomic="false" className="contents">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

const VARIANT_CLASS: Record<ToastItem['variant'], string> = {
  info: 'border-border bg-surface-raised text-text-primary',
  success: 'border-success/40 bg-surface-raised text-text-primary',
  error: 'border-danger/50 bg-surface-raised text-text-primary',
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}): JSX.Element {
  return (
    <div
      className={`pointer-events-auto w-full max-w-sm rounded-card border px-4 py-3 shadow-lift animate-toast-in ${VARIANT_CLASS[item.variant]}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5">{item.title}</p>
          {item.description !== undefined && (
            <p className="mt-1 text-sm leading-5 text-text-secondary">{item.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-control px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
          aria-label="Dismiss notification"
        >
          Close
        </button>
      </div>
    </div>
  );
}