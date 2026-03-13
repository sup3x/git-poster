import { describe, it, expect } from 'vitest';
import { getTheme, getThemeNames } from '../src/themes.js';
import type { Theme } from '../src/types.js';

const REQUIRED_KEYS: (keyof Theme)[] = [
  'name', 'background', 'foreground', 'foregroundMuted',
  'accent', 'heatmap', 'chartColors', 'border', 'cardBackground',
];

describe('getThemeNames', () => {
  it('returns all 5 theme names', () => {
    const names = getThemeNames();
    expect(names).toEqual(['dark', 'light', 'midnight', 'forest', 'ocean']);
  });
});

describe('getTheme', () => {
  it('returns dark theme by default name', () => {
    const theme = getTheme('dark');
    expect(theme.name).toBe('dark');
    expect(theme.background).toBe('#0d1117');
  });

  it('returns light theme', () => {
    expect(getTheme('light').background).toBe('#ffffff');
  });

  it('returns midnight theme', () => {
    expect(getTheme('midnight').background).toBe('#0a0e27');
  });

  it('returns forest theme', () => {
    expect(getTheme('forest').background).toBe('#0b1a0b');
  });

  it('returns ocean theme', () => {
    expect(getTheme('ocean').background).toBe('#0a192f');
  });

  it('throws on invalid theme name', () => {
    expect(() => getTheme('invalid')).toThrow(
      "Unknown theme 'invalid'. Available: dark, light, midnight, forest, ocean"
    );
  });

  it.each(getThemeNames())('theme "%s" has all required fields', (name) => {
    const theme = getTheme(name);
    for (const key of REQUIRED_KEYS) {
      expect(theme[key]).toBeDefined();
    }
  });

  it.each(getThemeNames())('theme "%s" has 5 heatmap levels', (name) => {
    expect(getTheme(name).heatmap).toHaveLength(5);
  });

  it.each(getThemeNames())('theme "%s" has 8 chart colors', (name) => {
    expect(getTheme(name).chartColors).toHaveLength(8);
  });
});
