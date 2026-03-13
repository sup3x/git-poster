import type { Theme } from './types.js';

const themes: Record<string, Theme> = {
  dark: {
    name: 'dark', background: '#0d1117', foreground: '#e6edf3', foregroundMuted: '#8b949e', accent: '#58a6ff',
    heatmap: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    chartColors: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#39d353', '#e3b341', '#f0883e'],
    border: '#30363d', cardBackground: '#161b22',
  },
  light: {
    name: 'light', background: '#ffffff', foreground: '#1f2328', foregroundMuted: '#656d76', accent: '#0969da',
    heatmap: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    chartColors: ['#0969da', '#1a7f37', '#9a6700', '#cf222e', '#8250df', '#2da44e', '#bf8700', '#bc4c00'],
    border: '#d0d7de', cardBackground: '#f6f8fa',
  },
  midnight: {
    name: 'midnight', background: '#0a0e27', foreground: '#a2b2d0', foregroundMuted: '#5a6a8a', accent: '#6c5ce7',
    heatmap: ['#141832', '#1e2a6e', '#3b4fad', '#5b7cfa', '#8fa7ff'],
    chartColors: ['#6c5ce7', '#00cec9', '#fdcb6e', '#e17055', '#a29bfe', '#55efc4', '#ffeaa7', '#fab1a0'],
    border: '#1e2a4a', cardBackground: '#0f1535',
  },
  forest: {
    name: 'forest', background: '#0b1a0b', foreground: '#b8d4b8', foregroundMuted: '#5a8a5a', accent: '#4caf50',
    heatmap: ['#132413', '#1b4d1b', '#2d7a2d', '#4caf4c', '#7bc67b'],
    chartColors: ['#4caf50', '#81c784', '#aed581', '#dce775', '#fff176', '#ffb74d', '#ff8a65', '#a1887f'],
    border: '#1e3a1e', cardBackground: '#0f220f',
  },
  ocean: {
    name: 'ocean', background: '#0a192f', foreground: '#8892b0', foregroundMuted: '#4a5568', accent: '#64ffda',
    heatmap: ['#112240', '#1a3a5c', '#2a6496', '#45a5c4', '#64ffda'],
    chartColors: ['#64ffda', '#7e57c2', '#ffd54f', '#ff7043', '#4dd0e1', '#81c784', '#ffb74d', '#f06292'],
    border: '#1e3a5f', cardBackground: '#112240',
  },
};

export function getTheme(name: string): Theme {
  const theme = themes[name];
  if (!theme) {
    const available = Object.keys(themes).join(', ');
    throw new Error(`Unknown theme '${name}'. Available: ${available}`);
  }
  return theme;
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}
