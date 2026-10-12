import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadConfig, type LoadedConfig } from './load';
import { DEFAULT_CONFIG } from './defaults';
import { ConfigContext, type ConfigContextValue } from './context';

type Props = { children: ReactNode };

export function ConfigProvider({ children }: Props): JSX.Element {
  const [state, setState] = useState<LoadedConfig>({
    config: DEFAULT_CONFIG,
    source: 'fallback',
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    void loadConfig(controller.signal).then((loaded) => {
      if (!cancelled) setState(loaded);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const value = useMemo<ConfigContextValue>(
    () => ({ config: state.config, source: state.source }),
    [state.config, state.source],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}