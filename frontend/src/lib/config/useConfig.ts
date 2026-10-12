import { useContext } from 'react';
import { ConfigContext, type ConfigContextValue } from './context';

export function useConfig(): ConfigContextValue {
  const value = useContext(ConfigContext);
  if (value === null) {
    throw new Error('useConfig must be used inside <ConfigProvider>');
  }
  return value;
}