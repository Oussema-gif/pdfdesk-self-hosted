import { describe, expect, it } from 'vitest';
import { validateConfig } from './validate';
import { DEFAULT_CONFIG } from './defaults';
import { DEFAULT_ACCENT_COLOR, TOOL_IDS } from './types';

describe('validateConfig', () => {
  it('returns defaults for non-object input', () => {
    expect(validateConfig(null).appName).toBe(DEFAULT_CONFIG.appName);
    expect(validateConfig('nope').limits.maxPages).toBe(DEFAULT_CONFIG.limits.maxPages);
    expect(validateConfig([1, 2, 3]).appName).toBe(DEFAULT_CONFIG.appName);
  });

  it('accepts a well-formed config', () => {
    const out = validateConfig({
      appName: 'Acme PDF',
      accentColor: '#00ff00',
      limits: { maxFileSizeMb: 25, maxPages: 500 },
      tools: { merge: false, split: true },
    });
    expect(out.appName).toBe('Acme PDF');
    expect(out.accentColor).toBe('#00ff00');
    expect(out.limits).toEqual({ maxFileSizeMb: 25, maxPages: 500 });
    expect(out.tools.merge).toBe(false);
    expect(out.tools.split).toBe(true);
  });

  it('fills missing tools with defaults (true)', () => {
    const out = validateConfig({ tools: { merge: false } });
    for (const id of TOOL_IDS) {
      if (id === 'merge') expect(out.tools[id]).toBe(false);
      else expect(out.tools[id]).toBe(true);
    }
  });

  it('rejects malformed accent colors', () => {
    expect(validateConfig({ accentColor: 'red' }).accentColor).toBe(DEFAULT_ACCENT_COLOR);
    expect(validateConfig({ accentColor: '#abc' }).accentColor).toBe(DEFAULT_ACCENT_COLOR);
    expect(validateConfig({ accentColor: 42 }).accentColor).toBe(DEFAULT_ACCENT_COLOR);
  });

  it('coerces invalid numbers and strings to defaults', () => {
    const out = validateConfig({
      appName: '   ',
      limits: { maxFileSizeMb: -5, maxPages: 'lots' },
    });
    expect(out.appName).toBe(DEFAULT_CONFIG.appName);
    expect(out.limits.maxFileSizeMb).toBe(DEFAULT_CONFIG.limits.maxFileSizeMb);
    expect(out.limits.maxPages).toBe(DEFAULT_CONFIG.limits.maxPages);
  });

  it('drops unknown fields', () => {
    const out = validateConfig({ appName: 'A', secretPath: '/etc/passwd' });
    expect(Object.keys(out).sort()).toEqual(['accentColor', 'appName', 'limits', 'tools']);
  });
});