import { createContext } from 'react';
import type { ResolvedTheme, ThemePreference } from './theme';

export type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  /** Cycles light → dark → system → light. */
  cycle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);