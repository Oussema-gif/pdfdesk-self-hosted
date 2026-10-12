import { describe, expect, it } from 'vitest';
import {
  hexToRgbTriplet,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeStoredPreference,
  readStoredPreference,
} from './theme';

describe('resolveTheme', () => {
  it('returns the explicit preference when it is light or dark', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
  it('follows the system when preference is system', () => {
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', 'light')).toBe('light');
  });
});

describe('hexToRgbTriplet', () => {
  it('converts a valid hex to space-separated triplet', () => {
    expect(hexToRgbTriplet('#4f46e5', '0 0 0')).toBe('79 70 229');
    expect(hexToRgbTriplet('#ffffff', '0 0 0')).toBe('255 255 255');
    expect(hexToRgbTriplet('#000000', '9 9 9')).toBe('0 0 0');
  });
  it('falls back on malformed input', () => {
    expect(hexToRgbTriplet('red', '1 2 3')).toBe('1 2 3');
    expect(hexToRgbTriplet('#abc', '1 2 3')).toBe('1 2 3');
    expect(hexToRgbTriplet('', '1 2 3')).toBe('1 2 3');
  });
});

describe('isThemePreference', () => {
  it('accepts the three known values and rejects everything else', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('storage round-trip', () => {
  it('writes and reads back the preference', () => {
    const store = new Map<string, string>();
    const fake: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k) => store.get(k) ?? null,
      key: (i) => Array.from(store.keys())[i] ?? null,
      removeItem: (k) => {
        store.delete(k);
      },
      setItem: (k, v) => {
        store.set(k, v);
      },
    };
    writeStoredPreference('dark', fake);
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredPreference(fake)).toBe('dark');

    // Malformed values fall back to 'system'.
    store.set(THEME_STORAGE_KEY, 'sepia');
    expect(readStoredPreference(fake)).toBe('system');
  });
});