import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from './context';

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (value === null) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return value;
}