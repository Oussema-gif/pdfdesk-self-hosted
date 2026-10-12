import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './load';
import { DEFAULT_CONFIG } from './defaults';

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadConfig', () => {
  it('returns validated config on 200', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ appName: 'Custom', accentColor: '#123456' }),
    });

    const loaded = await loadConfig();
    expect(loaded.source).toBe('api');
    expect(loaded.config.appName).toBe('Custom');
    expect(loaded.config.accentColor).toBe('#123456');
  });

  it('falls back on non-2xx', async () => {
    mockFetch({ ok: false, status: 404 });
    const loaded = await loadConfig();
    expect(loaded.source).toBe('fallback');
    expect(loaded.config.appName).toBe(DEFAULT_CONFIG.appName);
  });

  it('falls back on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const loaded = await loadConfig();
    expect(loaded.source).toBe('fallback');
    expect(loaded.config).toEqual(DEFAULT_CONFIG);
  });

  it('falls back on malformed JSON', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    });
    const loaded = await loadConfig();
    expect(loaded.source).toBe('fallback');
  });

  it('requests the relative path ./api/config', async () => {
    const spy = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', spy);
    await loadConfig();
    expect(spy).toHaveBeenCalledWith('./api/config', expect.objectContaining({ method: 'GET' }));
  });
});