import { DEFAULT_CONFIG } from './defaults';
import { validateConfig } from './validate';
import type { AppConfig } from './types';

export type ConfigSource = 'api' | 'fallback';

export type LoadedConfig = {
  config: AppConfig;
  source: ConfigSource;
  /** Present only when a fetch or parse failed. Never surfaced to the UI. */
  error?: unknown;
};

/**
 * Fetches ./api/config relative to the current document. Uses a relative path
 * (no leading slash) so the call works from any subdirectory, matching the
 * Vite base: './' asset strategy.
 *
 * Never throws. On any failure returns DEFAULT_CONFIG with source:'fallback'
 * so the app remains usable when hosted statically (no PHP backend).
 */
export async function loadConfig(signal?: AbortSignal): Promise<LoadedConfig> {
  try {
    const res = await fetch('./api/config', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });

    if (!res.ok) {
      return { config: DEFAULT_CONFIG, source: 'fallback', error: new Error(`HTTP ${res.status}`) };
    }

    const json: unknown = await res.json();
    return { config: validateConfig(json), source: 'api' };
  } catch (error) {
    return { config: DEFAULT_CONFIG, source: 'fallback', error };
  }
}