import { describe, it, expect } from 'vitest';
import { generatePoster } from '../src/poster.js';
import { getTheme } from '../src/themes.js';
import type { AnalyzedData } from '../src/types.js';

function makeAnalyzedData(overrides: Partial<AnalyzedData> = {}): AnalyzedData {
  return {
    repoName: 'test-repo',
    description: 'A test repository',
    totalCommits: 100,
    totalAuthors: 3,
    totalFiles: 50,
    firstCommitDate: new Date('2025-01-01T00:00:00Z'),
    lastCommitDate: new Date('2025-12-31T00:00:00Z'),
    activeDays: 365,
    busiestDay: { date: '2025-06-15', count: 10 },
    busiestHour: { hour: 14, count: 25 },
    dailyCommits: new Map([['2025-06-15', 10], ['2025-06-16', 5]]),
    hourlyActivity: Array.from({ length: 24 }, (_, i) => (i === 14 ? 25 : i % 3)),
    weekdayActivity: [5, 20, 25, 22, 18, 10, 3],
    languages: [
      { name: 'TypeScript', count: 30, percentage: 60, color: '#3178c6' },
      { name: 'JavaScript', count: 15, percentage: 30, color: '#f1e05a' },
      { name: 'CSS', count: 5, percentage: 10, color: '#563d7c' },
    ],
    topContributors: [
      { name: 'Alice', commits: 50, percentage: 50 },
      { name: 'Bob', commits: 30, percentage: 30 },
      { name: 'Charlie', commits: 20, percentage: 20 },
    ],
    ...overrides,
  };
}

describe('generatePoster', () => {
  const theme = getTheme('dark');
  const opts = { width: 1200, height: 800, theme };

  it('returns valid SVG with XML declaration', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');
  });

  it('includes viewBox matching dimensions', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('viewBox="0 0 1200 800"');
  });

  it('applies theme background color', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain(theme.background);
  });

  it('includes repo name in header', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('test-repo');
  });

  it('includes git-poster branding', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('git-poster');
  });

  it('includes stats cards with labels', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Commits');
    expect(svg).toContain('Authors');
    expect(svg).toContain('Files');
    expect(svg).toContain('First Commit');
    expect(svg).toContain('Last Commit');
    expect(svg).toContain('Active Days');
  });

  it('includes heatmap cells with theme heatmap colors', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain(theme.heatmap[0]);
  });

  it('includes heatmap day labels (Mon, Wed, Fri)', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Mon');
    expect(svg).toContain('Wed');
    expect(svg).toContain('Fri');
  });

  it('includes hourly activity bars', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain(theme.accent);
  });

  it('includes language names and colors', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('TypeScript');
    expect(svg).toContain('#3178c6');
    expect(svg).toContain('JavaScript');
  });

  it('includes contributor names', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Alice');
    expect(svg).toContain('Bob');
  });

  it('escapes special XML characters in repo name', () => {
    const data = makeAnalyzedData({ repoName: 'test<repo>&"name' });
    const svg = generatePoster(data, opts);
    expect(svg).toContain('test&lt;repo&gt;&amp;&quot;name');
    expect(svg).not.toContain('test<repo>&"name');
  });

  it('truncates long repo name with ellipsis', () => {
    const longName = 'a'.repeat(50);
    const data = makeAnalyzedData({ repoName: longName });
    const svg = generatePoster(data, opts);
    expect(svg).toContain('...');
  });

  it('works with custom dimensions', () => {
    const svg = generatePoster(makeAnalyzedData(), { width: 1600, height: 1000, theme });
    expect(svg).toContain('viewBox="0 0 1600 1000"');
    expect(svg).toContain('width="1600"');
  });

  it('works with all 5 themes', () => {
    for (const name of ['dark', 'light', 'midnight', 'forest', 'ocean']) {
      const t = getTheme(name);
      const svg = generatePoster(makeAnalyzedData(), { width: 1200, height: 800, theme: t });
      expect(svg).toContain(t.background);
    }
  });

  it('includes footer text', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Generated with git-poster');
  });

  it('handles single-contributor display', () => {
    const data = makeAnalyzedData({
      topContributors: [{ name: 'Alice', commits: 100, percentage: 100 }],
    });
    const svg = generatePoster(data, opts);
    expect(svg).toContain('Alice');
  });
});
