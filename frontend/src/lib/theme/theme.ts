export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pdfdesk.theme';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system'];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  system: ResolvedTheme,
): ResolvedTheme {
  if (preference === 'system') return system;
  return preference;
}

/**
 * Reads the stored preference from localStorage. Returns 'system' when the
 * value is absent, malformed, or storage is unavailable (Safari private mode,
 * disabled storage). Never throws.
 */
export function readStoredPreference(storage: Storage | undefined = safeStorage()): ThemePreference {
  if (!storage) return 'system';
  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : 'system';
  } catch {
    return 'system';
  }
}

export function writeStoredPreference(
  preference: ThemePreference,
  storage: Storage | undefined = safeStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

function safeStorage(): Storage | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Converts "#rrggbb" to "r g b" for use in `rgb(var(--color-*) / <alpha>)`.
 * Returns the fallback triplet unchanged if the input is not a 6-digit hex.
 */
export function hexToRgbTriplet(hex: string, fallback: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return fallback;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

/**
 * Detects the OS-level colour scheme. Returns 'light' when matchMedia is
 * unavailable (SSR, jsdom without polyfill, very old browsers).
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}