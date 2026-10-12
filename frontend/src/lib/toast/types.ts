export type ToastVariant = 'info' | 'success' | 'error';

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Pass 0 to disable auto-dismiss. */
  durationMs?: number;
};

export type ToastItem = ToastInput & {
  id: string;
  variant: ToastVariant;
  durationMs: number;
};