import { useMemo } from 'react';
import { useConfig } from '../../lib/config';
import { filterEnabledTools, getTool, type Tool } from './registry';

export function useTools(): Tool[] {
  const { config } = useConfig();
  return useMemo(() => filterEnabledTools(config.tools), [config.tools]);
}

export function useTool(id: string | undefined): Tool | undefined {
  const { config } = useConfig();
  return useMemo(() => {
    if (id === undefined) return undefined;
    const tool = getTool(id);
    if (tool === undefined) return undefined;
    return config.tools[tool.id] ? tool : undefined;
  }, [id, config.tools]);
}