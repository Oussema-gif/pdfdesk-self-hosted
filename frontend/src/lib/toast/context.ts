import { createContext } from 'react';
import type { ToastInput } from './types';

export type ToastContextValue = {
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);