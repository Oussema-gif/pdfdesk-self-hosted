import { DEFAULT_ACCENT_COLOR, TOOL_IDS, type AppConfig, type ToolFlags } from './types';

const allToolsEnabled: ToolFlags = Object.fromEntries(
  TOOL_IDS.map((id) => [id, true]),
) as ToolFlags;

export const DEFAULT_CONFIG: AppConfig = {
  appName: 'PDFDesk',
  accentColor: DEFAULT_ACCENT_COLOR,
  limits: {
    maxFileSizeMb: 100,
    maxPages: 2000,
  },
  tools: allToolsEnabled,
};