import { createContext } from 'react';
import type { AppConfig } from './types';
import type { ConfigSource } from './load';

export type ConfigContextValue = {
  config: AppConfig;
  source: ConfigSource;
};

export const ConfigContext = createContext<ConfigContextValue | null>(null);