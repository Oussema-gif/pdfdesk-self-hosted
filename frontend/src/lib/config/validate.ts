import { DEFAULT_CONFIG } from './defaults';
import {
  DEFAULT_ACCENT_COLOR,
  TOOL_IDS,
  type AppConfig,
  type ToolFlags,
  type ToolId,
} from './types';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function pickHexColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX_COLOR_RE.test(value) ? value : fallback;
}

function pickPositiveInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const n = Math.trunc(value);
  return n > 0 ? n : fallback;
}

function pickToolFlags(value: unknown, fallback: ToolFlags): ToolFlags {
  if (!isRecord(value)) return { ...fallback };
  const out: ToolFlags = { ...fallback };
  for (const id of TOOL_IDS) {
    const raw = value[id];
    if (typeof raw === 'boolean') out[id as ToolId] = raw;
  }
  return out;
}

/**
 * Accepts any input and returns a fully-populated AppConfig. Never throws.
 * Unknown fields are dropped, invalid values are replaced with defaults,
 * and any tool missing from the payload keeps its default (`true`).
 */
export function validateConfig(input: unknown): AppConfig {
  if (!isRecord(input)) return { ...DEFAULT_CONFIG, tools: { ...DEFAULT_CONFIG.tools } };

  const limitsRaw = isRecord(input.limits) ? input.limits : {};

  return {
    appName: pickString(input.appName, DEFAULT_CONFIG.appName),
    accentColor: pickHexColor(input.accentColor, DEFAULT_ACCENT_COLOR),
    limits: {
      maxFileSizeMb: pickPositiveInt(limitsRaw.maxFileSizeMb, DEFAULT_CONFIG.limits.maxFileSizeMb),
      maxPages: pickPositiveInt(limitsRaw.maxPages, DEFAULT_CONFIG.limits.maxPages),
    },
    tools: pickToolFlags(input.tools, DEFAULT_CONFIG.tools),
  };
}