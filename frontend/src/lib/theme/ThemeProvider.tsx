import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  getSystemTheme,
  hexToRgbTriplet,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme';
import { ThemeContext, type ThemeContextValue } from './context';
import { useConfig } from '../config/useConfig';

type Props = { children: ReactNode };

const DEFAULT_ACCENT_TRIPLET = '79 70 229';

function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}

function applyAccentColor(hex: string): void {
  const triplet = hexToRgbTriplet(hex, DEFAULT_ACCENT_TRIPLET);
  document.documentElement.style.setProperty('--color-accent', triplet);
}

export function ThemeProvider({ children }: Props): JSX.Element {
  const { config } = useConfig();
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
  const [system, setSystem] = useState<ResolvedTheme>(() => getSystemTheme());

  // Subscribe to OS colour scheme changes.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent): void => {
      setSystem(event.matches ? 'dark' : 'light');
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolved = useMemo(() => resolveTheme(preference, system), [preference, system]);

  // Apply resolved theme to <html>.
  useEffect(() => {
    applyResolvedTheme(resolved);
  }, [resolved]);

  // Apply accent colour whenever config changes it.
  useEffect(() => {
    applyAccentColor(config.accentColor);
  }, [config.accentColor]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    writeStoredPreference(next);
  }, []);

  const cycle = useCallback(() => {
    setPreferenceState((current) => {
      const order: ThemePreference[] = ['light', 'dark', 'system'];
      const idx = order.indexOf(current);
      const next = order[(idx + 1) % order.length] ?? 'system';
      writeStoredPreference(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cycle }),
    [preference, resolved, setPreference, cycle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}