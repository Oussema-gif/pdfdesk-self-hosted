import { describe, expect, it } from 'vitest';
import { TOOLS, filterEnabledTools, getTool } from './registry';
import { TOOL_IDS, type ToolFlags } from '../../lib/config';

const allEnabled: ToolFlags = Object.fromEntries(
  TOOL_IDS.map((id) => [id, true]),
) as ToolFlags;

describe('TOOLS registry', () => {
  it('contains every known ToolId exactly once', () => {
    const ids = TOOLS.map((t) => t.id).sort();
    expect(ids).toEqual([...TOOL_IDS].sort());
  });

  it('derives route from id', () => {
    for (const tool of TOOLS) {
      expect(tool.route).toBe(`/tool/${tool.id}`);
    }
  });

  it('getTool finds by id and returns undefined for unknown', () => {
    expect(getTool('merge')?.label).toBe('Merge');
    expect(getTool('nope')).toBeUndefined();
  });
});

describe('filterEnabledTools', () => {
  it('returns all when all enabled', () => {
    expect(filterEnabledTools(allEnabled).length).toBe(TOOL_IDS.length);
  });

  it('drops disabled tools', () => {
    const flags: ToolFlags = { ...allEnabled, merge: false, split: false };
    const enabled = filterEnabledTools(flags).map((t) => t.id);
    expect(enabled).not.toContain('merge');
    expect(enabled).not.toContain('split');
    expect(enabled).toContain('organize');
  });

  it('returns an empty array when nothing is enabled', () => {
    const flags = Object.fromEntries(TOOL_IDS.map((id) => [id, false])) as ToolFlags;
    expect(filterEnabledTools(flags)).toEqual([]);
  });
});