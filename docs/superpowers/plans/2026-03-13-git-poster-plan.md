# git-poster Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that turns any Git repository's commit history into a beautiful SVG/PNG poster.

**Architecture:** 3-layer pipeline — CLI Layer (commander) parses args and orchestrates, Core Layer (git.ts + analyzer.ts) collects and processes data, Output Layer (poster.ts + terminal.ts + export.ts) renders SVG, terminal summary, and file export. All data flows through typed interfaces defined in types.ts.

**Tech Stack:** TypeScript (strict), Node.js >= 18, ESM, commander, simple-git, chalk, ora, cli-table3, tsup, vitest

**Spec:** `docs/superpowers/specs/2026-03-13-git-poster-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/types.ts` | All TypeScript interfaces (GitData, AnalyzedData, Theme, etc.) |
| `src/themes.ts` | 5 color themes + getTheme/getThemeNames |
| `src/analyzer.ts` | Pure function: GitData → AnalyzedData (statistics, grouping, language mapping) |
| `src/git.ts` | Git data collection via simple-git (log, ls-files, repo name) |
| `src/poster.ts` | SVG poster generator (manual string builder, 6 sections) |
| `src/terminal.ts` | Terminal output with chalk/ora (summary table) |
| `src/export.ts` | File I/O: saveSvg + savePng (optional sharp) |
| `src/index.ts` | CLI entry point (commander setup, orchestration) |
| `tests/themes.test.ts` | Theme validation tests |
| `tests/analyzer.test.ts` | Analyzer pure function tests |
| `tests/poster.test.ts` | SVG output validation tests |
| `tests/git.test.ts` | Integration tests with temp git repo |
| `package.json` | Package manifest |
| `tsconfig.json` | TypeScript config |
| `tsup.config.ts` | Build config with shebang |
| `vitest.config.ts` | Test config |
| `.gitignore` | Ignore patterns |
| `.npmignore` | npm publish ignore |
| `LICENSE` | MIT license |
| `.github/workflows/ci.yml` | CI pipeline |
| `README.md` | Documentation |

---

## Chunk 1: Project Scaffold + Types + Themes

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.npmignore`
- Create: `LICENSE`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "git-poster",
  "version": "1.0.0",
  "description": "Turn your Git history into a beautiful poster",
  "keywords": [
    "git", "visualization", "poster", "svg", "cli",
    "commit-history", "contribution-graph", "developer-tools"
  ],
  "author": "Kerim Gulen",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/sup3x/git-poster.git"
  },
  "bin": {
    "git-poster": "./dist/index.js"
  },
  "files": ["dist"],
  "type": "module",
  "main": "./dist/index.js",
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "cli-table3": "^0.6.5",
    "commander": "^12.1.0",
    "ora": "^8.1.0",
    "simple-git": "^3.27.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  },
  "peerDependencies": {
    "sharp": ">=0.33.0"
  },
  "peerDependenciesMeta": {
    "sharp": {
      "optional": true
    }
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  minify: false,
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 30000,
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
*.tgz
.DS_Store
Thumbs.db
```

- [ ] **Step 6: Create .npmignore**

```
src/
tests/
docs/
tsconfig.json
tsup.config.ts
vitest.config.ts
.github/
.gitignore
```

- [ ] **Step 7: Create LICENSE**

Standard MIT license with copyright `2026 Kerim Gulen`.

- [ ] **Step 8: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated, 0 vulnerabilities

- [ ] **Step 9: Verify build setup compiles**

Create a minimal `src/index.ts` with `console.log('git-poster');` and run: `npm run build`
Expected: `dist/index.js` created with shebang line

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsup.config.ts vitest.config.ts .gitignore .npmignore LICENSE src/index.ts
git commit -m "chore: scaffold project with build tooling"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create src/types.ts with all interfaces**

```typescript
// ── Git Data Types ──

export interface GitData {
  repoName: string;
  description?: string;
  totalCommits: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
  authors: AuthorStat[];
  commits: CommitInfo[];
  files: FileStat[];
}

export interface CommitInfo {
  hash: string;
  date: Date;
  author: string;
  message: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
}

export interface AuthorStat {
  name: string;
  commits: number;
  firstCommit: Date;
  lastCommit: Date;
}

export interface FileStat {
  extension: string;
  count: number;
  percentage: number;
}

// ── Analyzed Data Types ──

export interface AnalyzedData {
  repoName: string;
  description?: string;
  totalCommits: number;
  totalAuthors: number;
  totalFiles: number;
  firstCommitDate: Date;
  lastCommitDate: Date;
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
  busiestHour: { hour: number; count: number } | null;
  dailyCommits: Map<string, number>;
  hourlyActivity: number[];
  weekdayActivity: number[];
  languages: LanguageStat[];
  topContributors: ContributorStat[];
}

export interface LanguageStat {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ContributorStat {
  name: string;
  commits: number;
  percentage: number;
}

// ── Theme Types ──

export interface Theme {
  name: string;
  background: string;
  foreground: string;
  foregroundMuted: string;
  accent: string;
  heatmap: string[];
  chartColors: string[];
  border: string;
  cardBackground: string;
}

// ── Poster Options ──

export interface PosterOptions {
  width: number;
  height: number;
  theme: Theme;
}

// ── CLI Options ──

export interface CliOptions {
  repo: string;
  output: string;
  png: boolean;
  theme: string;
  branch?: string;
  since?: string;
  until?: string;
  author?: string;
  width: number;
  height: number;
  quiet: boolean;
  statsOnly: boolean;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Themes Module

**Files:**
- Create: `src/themes.ts`
- Create: `tests/themes.test.ts`

- [ ] **Step 1: Write failing tests for themes**

```typescript
// tests/themes.test.ts
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
    const theme = getTheme('light');
    expect(theme.name).toBe('light');
    expect(theme.background).toBe('#ffffff');
  });

  it('returns midnight theme', () => {
    const theme = getTheme('midnight');
    expect(theme.name).toBe('midnight');
    expect(theme.background).toBe('#0a0e27');
  });

  it('returns forest theme', () => {
    const theme = getTheme('forest');
    expect(theme.name).toBe('forest');
    expect(theme.background).toBe('#0b1a0b');
  });

  it('returns ocean theme', () => {
    const theme = getTheme('ocean');
    expect(theme.name).toBe('ocean');
    expect(theme.background).toBe('#0a192f');
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
    const theme = getTheme(name);
    expect(theme.heatmap).toHaveLength(5);
  });

  it.each(getThemeNames())('theme "%s" has 8 chart colors', (name) => {
    const theme = getTheme(name);
    expect(theme.chartColors).toHaveLength(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/themes.test.ts`
Expected: FAIL — cannot find module `../src/themes.js`

- [ ] **Step 3: Implement themes.ts**

```typescript
// src/themes.ts
import type { Theme } from './types.js';

const themes: Record<string, Theme> = {
  dark: {
    name: 'dark',
    background: '#0d1117',
    foreground: '#e6edf3',
    foregroundMuted: '#8b949e',
    accent: '#58a6ff',
    heatmap: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    chartColors: ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#39d353', '#e3b341', '#f0883e'],
    border: '#30363d',
    cardBackground: '#161b22',
  },
  light: {
    name: 'light',
    background: '#ffffff',
    foreground: '#1f2328',
    foregroundMuted: '#656d76',
    accent: '#0969da',
    heatmap: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    chartColors: ['#0969da', '#1a7f37', '#9a6700', '#cf222e', '#8250df', '#2da44e', '#bf8700', '#bc4c00'],
    border: '#d0d7de',
    cardBackground: '#f6f8fa',
  },
  midnight: {
    name: 'midnight',
    background: '#0a0e27',
    foreground: '#a2b2d0',
    foregroundMuted: '#5a6a8a',
    accent: '#6c5ce7',
    heatmap: ['#141832', '#1e2a6e', '#3b4fad', '#5b7cfa', '#8fa7ff'],
    chartColors: ['#6c5ce7', '#00cec9', '#fdcb6e', '#e17055', '#a29bfe', '#55efc4', '#ffeaa7', '#fab1a0'],
    border: '#1e2a4a',
    cardBackground: '#0f1535',
  },
  forest: {
    name: 'forest',
    background: '#0b1a0b',
    foreground: '#b8d4b8',
    foregroundMuted: '#5a8a5a',
    accent: '#4caf50',
    heatmap: ['#132413', '#1b4d1b', '#2d7a2d', '#4caf4c', '#7bc67b'],
    chartColors: ['#4caf50', '#81c784', '#aed581', '#dce775', '#fff176', '#ffb74d', '#ff8a65', '#a1887f'],
    border: '#1e3a1e',
    cardBackground: '#0f220f',
  },
  ocean: {
    name: 'ocean',
    background: '#0a192f',
    foreground: '#8892b0',
    foregroundMuted: '#4a5568',
    accent: '#64ffda',
    heatmap: ['#112240', '#1a3a5c', '#2a6496', '#45a5c4', '#64ffda'],
    chartColors: ['#64ffda', '#7e57c2', '#ffd54f', '#ff7043', '#4dd0e1', '#81c784', '#ffb74d', '#f06292'],
    border: '#1e3a5f',
    cardBackground: '#112240',
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/themes.test.ts`
Expected: All 10+ tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/themes.ts tests/themes.test.ts
git commit -m "feat: add 5 color themes with getTheme/getThemeNames"
```

---

## Chunk 2: Analyzer

### Task 4: Analyzer Module

**Files:**
- Create: `src/analyzer.ts`
- Create: `tests/analyzer.test.ts`

- [ ] **Step 1: Write failing tests for analyzer**

The analyzer is a pure function — test it with constructed `GitData` objects. Cover all spec scenarios: daily grouping, hourly grouping, language mapping, top contributors, active days, busiest day/hour, empty data, single commit.

```typescript
// tests/analyzer.test.ts
import { describe, it, expect } from 'vitest';
import { analyzeGitData } from '../src/analyzer.js';
import type { GitData, CommitInfo, AuthorStat, FileStat } from '../src/types.js';

function makeCommit(overrides: Partial<CommitInfo> = {}): CommitInfo {
  return {
    hash: 'abc123',
    date: new Date('2025-06-15T10:30:00Z'),
    author: 'Alice',
    message: 'test commit',
    filesChanged: 1,
    insertions: 10,
    deletions: 2,
    ...overrides,
  };
}

function makeGitData(overrides: Partial<GitData> = {}): GitData {
  const commits = overrides.commits ?? [makeCommit()];
  const firstDate = commits.length > 0
    ? new Date(Math.min(...commits.map(c => c.date.getTime())))
    : new Date();
  const lastDate = commits.length > 0
    ? new Date(Math.max(...commits.map(c => c.date.getTime())))
    : new Date();
  return {
    repoName: 'test-repo',
    totalCommits: commits.length,
    firstCommitDate: firstDate,
    lastCommitDate: lastDate,
    authors: overrides.authors ?? [{ name: 'Alice', commits: commits.length, firstCommit: firstDate, lastCommit: lastDate }],
    commits,
    files: overrides.files ?? [{ extension: '.ts', count: 10, percentage: 100 }],
    ...overrides,
  };
}

describe('analyzeGitData', () => {
  describe('basic stats', () => {
    it('calculates totalCommits, totalAuthors, totalFiles', () => {
      const data = makeGitData({
        files: [
          { extension: '.ts', count: 5, percentage: 50 },
          { extension: '.js', count: 5, percentage: 50 },
        ],
        authors: [
          { name: 'Alice', commits: 1, firstCommit: new Date(), lastCommit: new Date() },
          { name: 'Bob', commits: 1, firstCommit: new Date(), lastCommit: new Date() },
        ],
      });
      const result = analyzeGitData(data);
      expect(result.totalCommits).toBe(1);
      expect(result.totalAuthors).toBe(2);
      expect(result.totalFiles).toBe(10);
    });
  });

  describe('activeDays', () => {
    it('returns 1 for a single commit', () => {
      const result = analyzeGitData(makeGitData());
      expect(result.activeDays).toBe(1);
    });

    it('calculates inclusive day count between first and last commit', () => {
      const commits = [
        makeCommit({ date: new Date('2025-01-01T00:00:00Z') }),
        makeCommit({ date: new Date('2025-01-10T00:00:00Z') }),
      ];
      const data = makeGitData({ commits });
      const result = analyzeGitData(data);
      expect(result.activeDays).toBe(10);
    });
  });

  describe('daily grouping', () => {
    it('groups commits by YYYY-MM-DD', () => {
      const commits = [
        makeCommit({ date: new Date('2025-06-15T08:00:00Z') }),
        makeCommit({ date: new Date('2025-06-15T16:00:00Z') }),
        makeCommit({ date: new Date('2025-06-16T10:00:00Z') }),
      ];
      const data = makeGitData({ commits });
      const result = analyzeGitData(data);
      expect(result.dailyCommits.get('2025-06-15')).toBe(2);
      expect(result.dailyCommits.get('2025-06-16')).toBe(1);
    });
  });

  describe('hourly activity', () => {
    it('counts commits per hour (UTC)', () => {
      const commits = [
        makeCommit({ date: new Date('2025-06-15T09:00:00Z') }),
        makeCommit({ date: new Date('2025-06-15T09:30:00Z') }),
        makeCommit({ date: new Date('2025-06-15T14:00:00Z') }),
      ];
      const data = makeGitData({ commits });
      const result = analyzeGitData(data);
      expect(result.hourlyActivity[9]).toBe(2);
      expect(result.hourlyActivity[14]).toBe(1);
      expect(result.hourlyActivity[0]).toBe(0);
    });

    it('has exactly 24 entries', () => {
      const result = analyzeGitData(makeGitData());
      expect(result.hourlyActivity).toHaveLength(24);
    });
  });

  describe('weekday activity', () => {
    it('has exactly 7 entries', () => {
      const result = analyzeGitData(makeGitData());
      expect(result.weekdayActivity).toHaveLength(7);
    });
  });

  describe('busiest day/hour', () => {
    it('finds the busiest day', () => {
      const commits = [
        makeCommit({ date: new Date('2025-06-15T10:00:00Z') }),
        makeCommit({ date: new Date('2025-06-15T11:00:00Z') }),
        makeCommit({ date: new Date('2025-06-16T10:00:00Z') }),
      ];
      const data = makeGitData({ commits });
      const result = analyzeGitData(data);
      expect(result.busiestDay).toEqual({ date: '2025-06-15', count: 2 });
    });

    it('finds the busiest hour', () => {
      const commits = [
        makeCommit({ date: new Date('2025-06-15T14:00:00Z') }),
        makeCommit({ date: new Date('2025-06-16T14:30:00Z') }),
        makeCommit({ date: new Date('2025-06-15T09:00:00Z') }),
      ];
      const data = makeGitData({ commits });
      const result = analyzeGitData(data);
      expect(result.busiestHour).toEqual({ hour: 14, count: 2 });
    });
  });

  describe('language mapping', () => {
    it('maps known extensions to language names', () => {
      const data = makeGitData({
        files: [
          { extension: '.ts', count: 10, percentage: 50 },
          { extension: '.js', count: 5, percentage: 25 },
          { extension: '.css', count: 5, percentage: 25 },
        ],
      });
      const result = analyzeGitData(data);
      expect(result.languages.find(l => l.name === 'TypeScript')).toBeDefined();
      expect(result.languages.find(l => l.name === 'JavaScript')).toBeDefined();
      expect(result.languages.find(l => l.name === 'CSS')).toBeDefined();
    });

    it('merges .ts and .tsx into TypeScript', () => {
      const data = makeGitData({
        files: [
          { extension: '.ts', count: 8, percentage: 80 },
          { extension: '.tsx', count: 2, percentage: 20 },
        ],
      });
      const result = analyzeGitData(data);
      const ts = result.languages.find(l => l.name === 'TypeScript');
      expect(ts).toBeDefined();
      expect(ts!.count).toBe(10);
    });

    it('groups unmapped extensions as Other', () => {
      const data = makeGitData({
        files: [
          { extension: '.ts', count: 5, percentage: 50 },
          { extension: '.xyz', count: 3, percentage: 30 },
          { extension: '', count: 2, percentage: 20 },
        ],
      });
      const result = analyzeGitData(data);
      const other = result.languages.find(l => l.name === 'Other');
      expect(other).toBeDefined();
      expect(other!.count).toBe(5);
    });

    it('assigns correct colors from LANGUAGE_COLORS', () => {
      const data = makeGitData({
        files: [{ extension: '.ts', count: 10, percentage: 100 }],
      });
      const result = analyzeGitData(data);
      const ts = result.languages.find(l => l.name === 'TypeScript');
      expect(ts!.color).toBe('#3178c6');
    });
  });

  describe('top contributors', () => {
    it('returns top 5 sorted by commit count', () => {
      const authors: AuthorStat[] = Array.from({ length: 7 }, (_, i) => ({
        name: `User${i}`,
        commits: (7 - i) * 10,
        firstCommit: new Date(),
        lastCommit: new Date(),
      }));
      const data = makeGitData({ authors });
      const result = analyzeGitData(data);
      expect(result.topContributors).toHaveLength(5);
      expect(result.topContributors[0].name).toBe('User0');
      expect(result.topContributors[4].name).toBe('User4');
    });

    it('calculates percentage for each contributor', () => {
      const authors: AuthorStat[] = [
        { name: 'Alice', commits: 75, firstCommit: new Date(), lastCommit: new Date() },
        { name: 'Bob', commits: 25, firstCommit: new Date(), lastCommit: new Date() },
      ];
      const commits = Array.from({ length: 100 }, (_, i) =>
        makeCommit({ author: i < 75 ? 'Alice' : 'Bob' })
      );
      const data = makeGitData({ authors, commits, totalCommits: 100 });
      const result = analyzeGitData(data);
      expect(result.topContributors[0].percentage).toBeCloseTo(75);
      expect(result.topContributors[1].percentage).toBeCloseTo(25);
    });
  });

  describe('edge cases', () => {
    it('handles empty commits array', () => {
      const data = makeGitData({
        commits: [],
        authors: [],
        files: [],
        totalCommits: 0,
        firstCommitDate: new Date(),
        lastCommitDate: new Date(),
      });
      const result = analyzeGitData(data);
      expect(result.totalCommits).toBe(0);
      expect(result.activeDays).toBe(0);
      expect(result.busiestDay).toBeNull();
      expect(result.busiestHour).toBeNull();
      expect(result.languages).toEqual([]);
      expect(result.topContributors).toEqual([]);
      expect(result.hourlyActivity).toEqual(new Array(24).fill(0));
      expect(result.weekdayActivity).toEqual(new Array(7).fill(0));
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/analyzer.test.ts`
Expected: FAIL — cannot find module `../src/analyzer.js`

- [ ] **Step 3: Implement analyzer.ts**

```typescript
// src/analyzer.ts
import type { GitData, AnalyzedData, LanguageStat, ContributorStat } from './types.js';

const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.rs': 'Rust', '.go': 'Go',
  '.java': 'Java', '.rb': 'Ruby',
  '.cpp': 'C++', '.c': 'C', '.cs': 'C#',
  '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin',
  '.dart': 'Dart', '.vue': 'Vue', '.svelte': 'Svelte',
  '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
  '.json': 'JSON', '.md': 'Markdown',
  '.yml': 'YAML', '.yaml': 'YAML',
  '.sh': 'Shell', '.sql': 'SQL',
  '.r': 'R', '.lua': 'Lua', '.zig': 'Zig',
};

const LANGUAGE_COLORS: Record<string, string> = {
  'TypeScript': '#3178c6', 'JavaScript': '#f1e05a',
  'Python': '#3572a5', 'Rust': '#dea584', 'Go': '#00add8',
  'Java': '#b07219', 'Ruby': '#701516',
  'C++': '#f34b7d', 'C': '#555555', 'C#': '#178600',
  'PHP': '#4f5d95', 'Swift': '#f05138', 'Kotlin': '#a97bff',
  'Dart': '#00b4ab', 'Vue': '#41b883', 'Svelte': '#ff3e00',
  'HTML': '#e34c26', 'CSS': '#563d7c', 'SCSS': '#c6538c',
  'JSON': '#292929', 'Markdown': '#083fa1',
  'YAML': '#cb171e', 'Shell': '#89e051', 'SQL': '#e38c00',
  'R': '#198ce7', 'Lua': '#000080', 'Zig': '#ec915c',
};

const FALLBACK_COLOR = '#8b8b8b';

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function analyzeGitData(data: GitData): AnalyzedData {
  const { commits, authors, files } = data;

  // Daily commits
  const dailyCommits = new Map<string, number>();
  for (const c of commits) {
    const key = toDateKey(c.date);
    dailyCommits.set(key, (dailyCommits.get(key) ?? 0) + 1);
  }

  // Hourly activity (UTC)
  const hourlyActivity = new Array(24).fill(0) as number[];
  for (const c of commits) {
    hourlyActivity[c.date.getUTCHours()]++;
  }

  // Weekday activity (UTC, 0=Sun)
  const weekdayActivity = new Array(7).fill(0) as number[];
  for (const c of commits) {
    weekdayActivity[c.date.getUTCDay()]++;
  }

  // Active days
  let activeDays = 0;
  if (commits.length > 0) {
    const msPerDay = 86_400_000;
    activeDays = Math.floor(
      (data.lastCommitDate.getTime() - data.firstCommitDate.getTime()) / msPerDay
    ) + 1;
  }

  // Busiest day
  let busiestDay: { date: string; count: number } | null = null;
  for (const [date, count] of dailyCommits) {
    if (!busiestDay || count > busiestDay.count) {
      busiestDay = { date, count };
    }
  }

  // Busiest hour
  let busiestHour: { hour: number; count: number } | null = null;
  if (commits.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < 24; i++) {
      if (hourlyActivity[i] > hourlyActivity[maxIdx]) maxIdx = i;
    }
    busiestHour = { hour: maxIdx, count: hourlyActivity[maxIdx] };
  }

  // Language mapping
  const langCounts = new Map<string, number>();
  let totalFileCount = 0;
  for (const f of files) {
    totalFileCount += f.count;
    const lang = EXTENSION_MAP[f.extension] ?? 'Other';
    langCounts.set(lang, (langCounts.get(lang) ?? 0) + f.count);
  }

  // Extensionless files
  // (already handled: empty string extension maps to 'Other' via ?? fallback)

  const languages: LanguageStat[] = Array.from(langCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalFileCount > 0 ? (count / totalFileCount) * 100 : 0,
      color: LANGUAGE_COLORS[name] ?? FALLBACK_COLOR,
    }));

  // Top 5 contributors
  const sortedAuthors = [...authors].sort((a, b) => b.commits - a.commits);
  const topContributors: ContributorStat[] = sortedAuthors
    .slice(0, 5)
    .map(a => ({
      name: a.name,
      commits: a.commits,
      percentage: data.totalCommits > 0 ? (a.commits / data.totalCommits) * 100 : 0,
    }));

  return {
    repoName: data.repoName,
    description: data.description,
    totalCommits: data.totalCommits,
    totalAuthors: authors.length,
    totalFiles: totalFileCount,
    firstCommitDate: data.firstCommitDate,
    lastCommitDate: data.lastCommitDate,
    activeDays,
    busiestDay,
    busiestHour,
    dailyCommits,
    hourlyActivity,
    weekdayActivity,
    languages,
    topContributors,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/analyzer.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/analyzer.ts tests/analyzer.test.ts
git commit -m "feat: add analyzer module with language mapping and statistics"
```

---

## Chunk 3: Git Data Collector

### Task 5: Git Data Collector

**Files:**
- Create: `src/git.ts`
- Create: `tests/git.test.ts`

- [ ] **Step 1: Write integration tests for git.ts**

These tests create a temporary git repo using simple-git, make commits, and verify `collectGitData` returns correct data.

```typescript
// tests/git.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { collectGitData } from '../src/git.js';
import simpleGit from 'simple-git';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let tempDir: string;

async function createTempRepo(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-poster-test-'));
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig('user.email', 'test@test.com');
  await git.addConfig('user.name', 'Test User');

  // Create files
  fs.writeFileSync(path.join(dir, 'index.ts'), 'console.log("hello");');
  fs.writeFileSync(path.join(dir, 'style.css'), 'body {}');
  fs.writeFileSync(path.join(dir, 'Makefile'), 'all: build');

  await git.add('.');
  await git.commit('initial commit', { '--date': '2025-01-15T10:00:00Z' });

  fs.writeFileSync(path.join(dir, 'utils.ts'), 'export const x = 1;');
  await git.add('.');
  await git.commit('add utils', { '--date': '2025-02-20T14:00:00Z' });

  return dir;
}

beforeAll(async () => {
  tempDir = await createTempRepo();
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('collectGitData', () => {
  it('returns correct repo name from directory', async () => {
    const data = await collectGitData(tempDir);
    expect(data.repoName).toBe(path.basename(tempDir));
  });

  it('returns correct total commits', async () => {
    const data = await collectGitData(tempDir);
    expect(data.totalCommits).toBe(2);
  });

  it('returns commits with correct fields', async () => {
    const data = await collectGitData(tempDir);
    expect(data.commits.length).toBe(2);
    expect(data.commits[0].author).toBe('Test User');
    expect(data.commits[0].hash).toBeTruthy();
    expect(data.commits[0].message).toBeTruthy();
  });

  it('returns file stats with extensions', async () => {
    const data = await collectGitData(tempDir);
    expect(data.files.length).toBeGreaterThan(0);
    const tsFiles = data.files.find(f => f.extension === '.ts');
    expect(tsFiles).toBeDefined();
  });

  it('returns authors with commit counts', async () => {
    const data = await collectGitData(tempDir);
    expect(data.authors.length).toBe(1);
    expect(data.authors[0].name).toBe('Test User');
    expect(data.authors[0].commits).toBe(2);
  });

  it('returns first and last commit dates', async () => {
    const data = await collectGitData(tempDir);
    expect(data.firstCommitDate).toBeInstanceOf(Date);
    expect(data.lastCommitDate).toBeInstanceOf(Date);
    expect(data.firstCommitDate.getTime()).toBeLessThan(data.lastCommitDate.getTime());
  });

  it('throws on non-git directory', async () => {
    const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'not-git-'));
    await expect(collectGitData(nonGitDir)).rejects.toThrow('Not a git repository');
    fs.rmSync(nonGitDir, { recursive: true, force: true });
  });

  it('throws on empty git repo (no commits)', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'empty-git-'));
    const git = simpleGit(emptyDir);
    await git.init();
    await expect(collectGitData(emptyDir)).rejects.toThrow('no commits');
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('respects --since date filter', async () => {
    const data = await collectGitData(tempDir, { since: '2025-02-01' });
    // Only the second commit (2025-02-20) should be included
    expect(data.totalCommits).toBe(1);
    expect(data.commits[0].message).toContain('add utils');
  });

  it('respects --author filter', async () => {
    const data = await collectGitData(tempDir, { author: 'Test User' });
    expect(data.totalCommits).toBe(2);
  });

  it('respects --author filter with non-existent author', async () => {
    await expect(
      collectGitData(tempDir, { author: 'Nobody' })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/git.test.ts`
Expected: FAIL — cannot find module `../src/git.js`

- [ ] **Step 3: Implement git.ts**

```typescript
// src/git.ts
import simpleGit, { type SimpleGit, type LogResult } from 'simple-git';
import path from 'node:path';
import fs from 'node:fs';
import type { GitData, CommitInfo, AuthorStat, FileStat } from './types.js';

export async function collectGitData(
  repoPath: string,
  options?: { branch?: string; since?: string; until?: string; author?: string },
): Promise<GitData> {
  const git: SimpleGit = simpleGit(repoPath);

  // Verify it's a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Run this inside a git repo.');
  }

  // Build log options
  const logOpts: string[] = ['--no-merges', '--date=iso-strict'];
  if (options?.branch) {
    logOpts.push(options.branch);
  } else {
    logOpts.push('--all');
  }
  if (options?.since) logOpts.push(`--since=${options.since}`);
  if (options?.until) logOpts.push(`--until=${options.until}`);
  if (options?.author) logOpts.push(`--author=${options.author}`);

  const log: LogResult = await git.log(logOpts);

  if (log.total === 0) {
    throw new Error('This repository has no commits yet.');
  }

  // Parse commits
  const commits: CommitInfo[] = log.all.map(entry => ({
    hash: entry.hash,
    date: new Date(entry.date),
    author: entry.author_name,
    message: entry.message,
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
  }));

  // Get file list
  const lsFilesOutput = await git.raw(['ls-files']);
  const fileList = lsFilesOutput.trim().split('\n').filter(Boolean);

  // Group files by extension
  const extCounts = new Map<string, number>();
  for (const file of fileList) {
    const ext = path.extname(file).toLowerCase();
    extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
  }

  const totalFiles = fileList.length;
  const files: FileStat[] = Array.from(extCounts.entries()).map(([ext, count]) => ({
    extension: ext,
    count,
    percentage: totalFiles > 0 ? (count / totalFiles) * 100 : 0,
  }));

  // Group by author
  const authorMap = new Map<string, { commits: number; first: Date; last: Date }>();
  for (const c of commits) {
    const existing = authorMap.get(c.author);
    if (existing) {
      existing.commits++;
      if (c.date < existing.first) existing.first = c.date;
      if (c.date > existing.last) existing.last = c.date;
    } else {
      authorMap.set(c.author, { commits: 1, first: c.date, last: c.date });
    }
  }
  const authors: AuthorStat[] = Array.from(authorMap.entries()).map(([name, stat]) => ({
    name,
    commits: stat.commits,
    firstCommit: stat.first,
    lastCommit: stat.last,
  }));

  // Repo name
  let repoName: string;
  try {
    const remoteUrl = await git.remote(['get-url', 'origin']);
    if (remoteUrl) {
      const cleaned = remoteUrl.trim().replace(/\.git$/, '');
      repoName = cleaned.split('/').pop() ?? path.basename(repoPath);
    } else {
      repoName = path.basename(repoPath);
    }
  } catch {
    repoName = path.basename(repoPath);
  }

  // Description from package.json
  let description: string | undefined;
  try {
    const pkgPath = path.join(repoPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.description) description = pkg.description;
  } catch {
    // No package.json or invalid — that's fine
  }

  // Use loop instead of Math.min/max spread to avoid stack overflow on large repos
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const c of commits) {
    const t = c.date.getTime();
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
  }
  const firstCommitDate = new Date(minTime);
  const lastCommitDate = new Date(maxTime);

  return {
    repoName,
    description,
    totalCommits: commits.length,
    firstCommitDate,
    lastCommitDate,
    authors,
    commits,
    files,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/git.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/git.ts tests/git.test.ts
git commit -m "feat: add git data collector with simple-git"
```

---

## Chunk 4: SVG Poster Generator

### Task 6: SVG Poster Generator

**Files:**
- Create: `src/poster.ts`
- Create: `tests/poster.test.ts`

This is the largest module. The poster is built as a series of SVG string sections concatenated together.

- [ ] **Step 1: Write failing tests for poster**

```typescript
// tests/poster.test.ts
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
    // Heatmap uses rect elements with heatmap colors
    expect(svg).toContain(theme.heatmap[0]); // level 0 color
  });

  it('includes heatmap day labels (Mon, Wed, Fri)', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Mon');
    expect(svg).toContain('Wed');
    expect(svg).toContain('Fri');
  });

  it('includes hourly activity bars', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    // Hourly chart uses accent color for bars
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
    const themes = ['dark', 'light', 'midnight', 'forest', 'ocean'];
    for (const name of themes) {
      const t = getTheme(name);
      const svg = generatePoster(makeAnalyzedData(), { width: 1200, height: 800, theme: t });
      expect(svg).toContain(t.background);
    }
  });

  it('includes footer text', () => {
    const svg = generatePoster(makeAnalyzedData(), opts);
    expect(svg).toContain('Generated with git-poster');
  });

  it('handles single-contributor filtered display', () => {
    const data = makeAnalyzedData({
      topContributors: [{ name: 'Alice', commits: 100, percentage: 100 }],
    });
    const svg = generatePoster(data, opts);
    expect(svg).toContain('Alice');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/poster.test.ts`
Expected: FAIL — cannot find module `../src/poster.js`

- [ ] **Step 3: Implement poster.ts**

```typescript
// src/poster.ts
import type { AnalyzedData, PosterOptions, Theme } from './types.js';

// ── Helpers ──

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

function formatStatNumber(n: number): string {
  // Stat cards always use exact comma format
  return n.toLocaleString('en-US');
}

function formatShortNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('en-US');
}

function formatDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function getHeatmapLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const q = max / 4;
  if (count <= q) return 1;
  if (count <= q * 2) return 2;
  if (count <= q * 3) return 3;
  return 4;
}

const FONT = "'Segoe UI', system-ui, -apple-system, sans-serif";
const MONO = "'SF Mono', 'Fira Code', 'Cascadia Code', monospace";
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Section Renderers ──

function renderHeader(data: AnalyzedData, theme: Theme, pad: number, _innerW: number, sy: number, sx: number, width: number): string {
  let s = '';
  const y = 30 * sy;
  const name = escapeXml(truncate(data.repoName, 40));
  s += `<text x="${pad}" y="${y}" font-family="${FONT}" font-size="${22 * sy}" font-weight="bold" fill="${theme.foreground}">${name}</text>\n`;

  // Branding (right)
  s += `<text x="${width - pad}" y="${y}" font-family="${MONO}" font-size="${12 * sy}" fill="${theme.foregroundMuted}" text-anchor="end">git-poster</text>\n`;

  // Description
  if (data.description) {
    const desc = escapeXml(truncate(data.description, 80));
    s += `<text x="${pad}" y="${(y + 20 * sy)}" font-family="${FONT}" font-size="${12 * sy}" fill="${theme.foregroundMuted}">${desc}</text>\n`;
  }
  return s;
}

function renderHeatmap(data: AnalyzedData, theme: Theme, pad: number, _innerW: number, sy: number, sx: number): string {
  let s = '';
  const baseY = 80 * sy;
  const cellSize = 12 * sx;
  const gap = 3 * sx;
  const step = cellSize + gap;
  const labelW = 30 * sx; // space for day labels
  const monthLabelH = 14 * sy; // space for month labels

  // Find max daily count for level thresholds
  let maxCount = 0;
  for (const count of data.dailyCommits.values()) {
    if (count > maxCount) maxCount = count;
  }

  // Calculate weeks to render: from lastCommitDate backwards, up to 52 weeks
  const endDate = new Date(data.lastCommitDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 52 * 7);

  // Day labels (Mon=1, Wed=3, Fri=5)
  const dayLabelIndices = [1, 3, 5]; // Mon, Wed, Fri
  for (const dayIdx of dayLabelIndices) {
    const ly = baseY + monthLabelH + dayIdx * step + cellSize * 0.8;
    s += `<text x="${pad}" y="${ly}" font-family="${FONT}" font-size="${9 * sy}" fill="${theme.foregroundMuted}">${DAY_LABELS[dayIdx]}</text>\n`;
  }

  // Render grid — iterate week by week
  const gridX = pad + labelW;
  let currentDate = new Date(startDate);
  // Align to start of week (Sunday)
  currentDate.setDate(currentDate.getDate() - currentDate.getUTCDay());

  let lastMonthLabel = -1;
  let weekCol = 0;

  while (currentDate <= endDate && weekCol < 52) {
    // Month label at top of column if month changed
    const month = currentDate.getUTCMonth();
    if (month !== lastMonthLabel) {
      const mx = gridX + weekCol * step;
      s += `<text x="${mx}" y="${baseY + 10 * sy}" font-family="${FONT}" font-size="${9 * sy}" fill="${theme.foregroundMuted}">${MONTH_LABELS[month]}</text>\n`;
      lastMonthLabel = month;
    }

    // Render 7 days in this week column
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(currentDate);
      cellDate.setDate(cellDate.getDate() + day);
      if (cellDate > endDate) break;

      const dateKey = cellDate.toISOString().slice(0, 10);
      const count = data.dailyCommits.get(dateKey) ?? 0;
      const level = getHeatmapLevel(count, maxCount);

      const cx = gridX + weekCol * step;
      const cy = baseY + monthLabelH + day * step;
      s += `<rect x="${cx}" y="${cy}" width="${cellSize}" height="${cellSize}" rx="2" fill="${theme.heatmap[level]}"/>\n`;
    }

    currentDate.setDate(currentDate.getDate() + 7);
    weekCol++;
  }

  return s;
}

function renderStats(data: AnalyzedData, theme: Theme, pad: number, innerW: number, sy: number, _sx: number): string {
  let s = '';
  const baseY = 240 * sy;
  const cardW = (innerW - 20) / 3;
  const cardH = 48 * sy;
  const rowGap = 8 * sy;

  const cards = [
    [
      { label: 'Commits', value: formatStatNumber(data.totalCommits) },
      { label: 'Authors', value: formatStatNumber(data.totalAuthors) },
      { label: 'Files', value: formatStatNumber(data.totalFiles) },
    ],
    [
      { label: 'First Commit', value: formatDate(data.firstCommitDate) },
      { label: 'Last Commit', value: formatDate(data.lastCommitDate) },
      { label: 'Active Days', value: formatStatNumber(data.activeDays) },
    ],
  ];

  for (let row = 0; row < cards.length; row++) {
    for (let col = 0; col < cards[row].length; col++) {
      const card = cards[row][col];
      const cx = pad + col * (cardW + 10);
      const cy = baseY + row * (cardH + rowGap);

      s += `<rect x="${cx}" y="${cy}" width="${cardW}" height="${cardH}" rx="8" fill="${theme.cardBackground}" stroke="${theme.border}" stroke-width="1"/>\n`;
      s += `<text x="${cx + 12}" y="${cy + 18 * sy}" font-family="${FONT}" font-size="${10 * sy}" fill="${theme.foregroundMuted}">${card.label}</text>\n`;
      s += `<text x="${cx + 12}" y="${cy + 36 * sy}" font-family="${MONO}" font-size="${16 * sy}" font-weight="bold" fill="${theme.foreground}">${escapeXml(card.value)}</text>\n`;
    }
  }

  return s;
}

function renderCharts(data: AnalyzedData, theme: Theme, pad: number, innerW: number, sy: number, _sx: number): string {
  let s = '';
  const baseY = 370 * sy;
  const chartH = 110 * sy;
  const halfW = (innerW - 20) / 2;

  // ── Left: Hourly Activity (24 bars) ──
  s += `<text x="${pad}" y="${baseY - 8 * sy}" font-family="${FONT}" font-size="${11 * sy}" font-weight="bold" fill="${theme.foreground}">Hourly Activity</text>\n`;

  const maxHour = Math.max(...data.hourlyActivity, 1);
  const barW = (halfW - 10) / 24;
  for (let h = 0; h < 24; h++) {
    const count = data.hourlyActivity[h];
    const barH = (count / maxHour) * chartH;
    const bx = pad + h * barW;
    const by = baseY + chartH - barH;
    s += `<rect x="${bx}" y="${by}" width="${barW - 2}" height="${barH}" rx="2" fill="${theme.accent}" opacity="0.8"/>\n`;
  }

  // Hour labels (0, 6, 12, 18)
  for (const h of [0, 6, 12, 18]) {
    s += `<text x="${pad + h * barW}" y="${baseY + chartH + 12 * sy}" font-family="${FONT}" font-size="${8 * sy}" fill="${theme.foregroundMuted}">${h}h</text>\n`;
  }

  // ── Right: Language Breakdown ──
  const langX = pad + halfW + 20;
  s += `<text x="${langX}" y="${baseY - 8 * sy}" font-family="${FONT}" font-size="${11 * sy}" font-weight="bold" fill="${theme.foreground}">Languages</text>\n`;

  // Stacked horizontal bar
  const barTotalW = halfW - 10;
  let barOffset = 0;
  for (const lang of data.languages.slice(0, 8)) {
    const segW = (lang.percentage / 100) * barTotalW;
    s += `<rect x="${langX + barOffset}" y="${baseY}" width="${segW}" height="${16 * sy}" rx="3" fill="${lang.color}"/>\n`;
    barOffset += segW;
  }

  // Legend
  let legendY = baseY + 30 * sy;
  for (const lang of data.languages.slice(0, 8)) {
    s += `<rect x="${langX}" y="${legendY}" width="${10 * sy}" height="${10 * sy}" rx="2" fill="${lang.color}"/>\n`;
    s += `<text x="${langX + 14 * sy}" y="${legendY + 9 * sy}" font-family="${FONT}" font-size="${10 * sy}" fill="${theme.foreground}">${escapeXml(lang.name)} ${lang.percentage.toFixed(1)}%</text>\n`;
    legendY += 16 * sy;
  }

  return s;
}

function renderContributors(data: AnalyzedData, theme: Theme, pad: number, innerW: number, sy: number, _sx: number): string {
  let s = '';
  const baseY = 520 * sy;
  s += `<text x="${pad}" y="${baseY - 8 * sy}" font-family="${FONT}" font-size="${11 * sy}" font-weight="bold" fill="${theme.foreground}">Top Contributors</text>\n`;

  if (data.topContributors.length === 0) return s;

  const maxCommits = data.topContributors[0].commits;
  const barMaxW = innerW * 0.5;
  let cy = baseY + 8 * sy;

  for (const contrib of data.topContributors) {
    const name = escapeXml(contrib.name);
    const barW = maxCommits > 0 ? (contrib.commits / maxCommits) * barMaxW : 0;

    // Name
    s += `<text x="${pad}" y="${cy + 13 * sy}" font-family="${MONO}" font-size="${11 * sy}" fill="${theme.foreground}">${name}</text>\n`;

    // Bar
    const barX = pad + innerW * 0.22;
    s += `<rect x="${barX}" y="${cy + 2 * sy}" width="${barW}" height="${14 * sy}" rx="3" fill="${theme.accent}" opacity="0.7"/>\n`;

    // Count
    s += `<text x="${barX + barW + 8}" y="${cy + 13 * sy}" font-family="${FONT}" font-size="${10 * sy}" fill="${theme.foregroundMuted}">${formatShortNumber(contrib.commits)} (${contrib.percentage.toFixed(1)}%)</text>\n`;

    cy += 28 * sy;
  }

  return s;
}

function renderFooter(theme: Theme, width: number, height: number, sy: number): string {
  const y = height - 20 * sy;
  return `<text x="${width / 2}" y="${y}" font-family="${FONT}" font-size="${10 * sy}" fill="${theme.foregroundMuted}" text-anchor="middle">Generated with git-poster</text>\n`;
}

// ── Main Export ──

export function generatePoster(data: AnalyzedData, options: PosterOptions): string {
  const { width, height, theme } = options;
  const sx = width / 1200;
  const sy = height / 800;
  const pad = 32 * sx;
  const innerW = width - pad * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
  svg += `<rect width="${width}" height="${height}" fill="${theme.background}" rx="12"/>\n`;

  svg += renderHeader(data, theme, pad, innerW, sy, sx, width);
  svg += renderHeatmap(data, theme, pad, innerW, sy, sx);
  svg += renderStats(data, theme, pad, innerW, sy, sx);
  svg += renderCharts(data, theme, pad, innerW, sy, sx);
  svg += renderContributors(data, theme, pad, innerW, sy, sx);
  svg += renderFooter(theme, width, height, sy);

  svg += `</svg>`;
  return svg;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/poster.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/poster.ts tests/poster.test.ts
git commit -m "feat: add SVG poster generator with all 6 sections"
```

---

## Chunk 5: Terminal Output + Export + CLI Entry Point

### Task 7: Terminal Output

**Files:**
- Create: `src/terminal.ts`

No dedicated tests — terminal output is visual and tested via integration. Keep it simple.

- [ ] **Step 1: Implement terminal.ts**

```typescript
// src/terminal.ts
import chalk from 'chalk';
import type { AnalyzedData } from './types.js';

const DIVIDER = chalk.dim('  ' + '\u2500'.repeat(50));
const BAR_CHAR = '\u2588';
const MAX_BAR = 20;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function renderTerminalSummary(data: AnalyzedData): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(DIVIDER);
  lines.push(chalk.bold('  Overview'));
  lines.push(DIVIDER);
  lines.push('');
  lines.push(`  Total Commits     ${formatNumber(data.totalCommits)}`);
  lines.push(`  Contributors      ${formatNumber(data.totalAuthors)}`);
  lines.push(`  Files             ${formatNumber(data.totalFiles)}`);
  lines.push(`  Active Days       ${formatNumber(data.activeDays)}`);
  lines.push(`  First Commit      ${formatDate(data.firstCommitDate)}`);
  lines.push(`  Last Commit       ${formatDate(data.lastCommitDate)}`);

  if (data.topContributors.length > 0) {
    lines.push('');
    lines.push(DIVIDER);
    lines.push(chalk.bold('  Top Contributors'));
    lines.push(DIVIDER);
    lines.push('');
    const maxCommits = data.topContributors[0].commits;
    for (const c of data.topContributors) {
      const barLen = Math.max(1, Math.round((c.commits / maxCommits) * MAX_BAR));
      const bar = chalk.green(BAR_CHAR.repeat(barLen));
      const name = `@${c.name}`.padEnd(14);
      lines.push(`  ${name}${bar}  ${c.commits} (${c.percentage.toFixed(1)}%)`);
    }
  }

  if (data.languages.length > 0) {
    lines.push('');
    lines.push(DIVIDER);
    lines.push(chalk.bold('  Languages'));
    lines.push(DIVIDER);
    lines.push('');
    const maxCount = data.languages[0].count;
    for (const lang of data.languages.slice(0, 8)) {
      const barLen = Math.max(1, Math.round((lang.count / maxCount) * MAX_BAR));
      const bar = chalk.cyan(BAR_CHAR.repeat(barLen));
      const name = lang.name.padEnd(14);
      lines.push(`  ${name}${bar}  ${lang.percentage.toFixed(1)}%`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/terminal.ts
git commit -m "feat: add terminal summary output with chalk"
```

---

### Task 8: File Export

**Files:**
- Create: `src/export.ts`

- [ ] **Step 1: Implement export.ts**

```typescript
// src/export.ts
import fs from 'node:fs';
import path from 'node:path';

export function saveSvg(svg: string, outputPath: string): void {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, svg, 'utf-8');
}

export async function savePng(svg: string, outputPath: string, scale = 2): Promise<void> {
  let sharp: typeof import('sharp');
  try {
    sharp = (await import('sharp')).default;
  } catch {
    throw new Error(
      "PNG export requires the 'sharp' package. Install: npm i -g sharp"
    );
  }

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(svg, 'utf-8');
  await sharp(buffer, { density: 72 * scale })
    .png()
    .toFile(outputPath);
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/export.ts
git commit -m "feat: add SVG/PNG file export with sharp support"
```

---

### Task 9: CLI Entry Point

**Files:**
- Modify: `src/index.ts` (replace the placeholder)

- [ ] **Step 1: Implement the full CLI entry point**

```typescript
// src/index.ts
import { program } from 'commander';
import { createRequire } from 'node:module';
import { collectGitData } from './git.js';
import { analyzeGitData } from './analyzer.js';
import { generatePoster } from './poster.js';
import { getTheme, getThemeNames } from './themes.js';
import { renderTerminalSummary } from './terminal.js';
import { saveSvg, savePng } from './export.js';
import chalk from 'chalk';
import ora from 'ora';
import path from 'node:path';
import simpleGit from 'simple-git';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

function fail(message: string): never {
  process.stderr.write(`\n  ${chalk.red('\u2716')} ${message}\n\n`);
  process.exit(1);
}

program
  .name('git-poster')
  .description('Turn your Git history into a beautiful poster')
  .version(pkg.version, '-V, --version')
  .option('--repo <path>', 'Repository path', process.cwd())
  .option('-o, --output <file>', 'Output file path')
  .option('--png', 'Export as PNG (requires sharp)')
  .option('--theme <name>', 'Color theme', 'dark')
  .option('--branch <name>', 'Analyze specific branch')
  .option('--since <date>', 'Start date (YYYY-MM-DD)')
  .option('--until <date>', 'End date (YYYY-MM-DD)')
  .option('--author <name>', 'Filter by author')
  .option('--width <px>', 'Poster width', '1200')
  .option('--height <px>', 'Poster height', '800')
  .option('-q, --quiet', 'No terminal output, only file')
  .option('--stats-only', 'Terminal output only, no file')
  .action(async (opts) => {
    try {
      // Validate conflicting flags
      if (opts.quiet && opts.statsOnly) {
        fail('Cannot use --quiet and --stats-only together.');
      }

      // Validate theme
      const themeNames = getThemeNames();
      if (!themeNames.includes(opts.theme)) {
        fail(`Unknown theme '${opts.theme}'. Available: ${themeNames.join(', ')}`);
      }

      // Validate dates
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (opts.since && !dateRegex.test(opts.since)) fail('Invalid date format. Use YYYY-MM-DD.');
      if (opts.until && !dateRegex.test(opts.until)) fail('Invalid date format. Use YYYY-MM-DD.');

      // Parse dimensions
      const width = parseInt(opts.width, 10);
      const height = parseInt(opts.height, 10);
      if (isNaN(width) || width < 400) fail('--width must be a number >= 400');
      if (isNaN(height) || height < 300) fail('--height must be a number >= 300');

      // Determine output path
      let outputPath = opts.output;
      if (!outputPath) {
        outputPath = opts.png ? 'git-poster.png' : 'git-poster.svg';
      } else if (opts.png && outputPath.endsWith('.svg')) {
        outputPath = outputPath.replace(/\.svg$/, '.png');
      }

      const repoPath = path.resolve(opts.repo);
      const theme = getTheme(opts.theme);
      const isTTY = process.stderr.isTTY;
      const showTerminal = !opts.quiet && isTTY;

      // Header
      if (showTerminal) {
        process.stderr.write(`\n  ${chalk.bold('git-poster')} ${chalk.cyan('\u2014')} analyzing...\n\n`);
      }

      const spinner = showTerminal ? ora({ text: 'Analyzing git history...', stream: process.stderr }).start() : null;

      // 50k commit guard
      const git = simpleGit(repoPath);
      let sinceOpt = opts.since;
      if (!sinceOpt) {
        try {
          const countArgs = opts.branch ? [opts.branch] : ['--all'];
          const countOutput = await git.raw(['rev-list', '--count', ...countArgs]);
          const totalCount = parseInt(countOutput.trim(), 10);
          if (totalCount > 50_000) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            sinceOpt = oneYearAgo.toISOString().slice(0, 10);
            if (spinner) spinner.warn('Repository has >50,000 commits. Analyzing last 1 year only. Use --since to override.');
            if (showTerminal && spinner) spinner.start('Analyzing git history...');
          }
        } catch {
          // rev-list may fail on empty repos — collectGitData will handle that
        }
      }

      // Collect data
      const gitData = await collectGitData(repoPath, {
        branch: opts.branch,
        since: sinceOpt,
        until: opts.until,
        author: opts.author,
      });

      // Analyze
      const analyzed = analyzeGitData(gitData);

      if (spinner) spinner.succeed('Analysis complete');

      // Terminal output
      if (showTerminal) {
        const summary = renderTerminalSummary(analyzed);
        process.stderr.write(summary);
      }

      // Generate and save poster
      if (!opts.statsOnly) {
        const svg = generatePoster(analyzed, { width, height, theme });

        if (opts.png) {
          try {
            await savePng(svg, outputPath);
          } catch (err) {
            fail(err instanceof Error ? err.message : String(err));
          }
        } else {
          try {
            saveSvg(svg, outputPath);
          } catch {
            fail(`Cannot write to '${outputPath}'. Check permissions.`);
          }
        }

        if (showTerminal) {
          process.stderr.write(`\n  ${chalk.green('\u2714')} Poster saved to ${outputPath}\n\n`);
        }
      }

      process.exit(0);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err));
    }
  });

program.parse();
```

- [ ] **Step 2: Build and verify**

Run: `npm run build`
Expected: `dist/index.js` created with shebang, no errors

- [ ] **Step 3: Smoke test — run against own repo**

Run: `node dist/index.js --repo .`
Expected: Should either produce output or show "no commits" error (since this is a new repo with few commits, it should work and produce `git-poster.svg`)

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI entry point with commander and all options"
```

---

## Chunk 6: CI + README + Final Polish

### Task 10: CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI
on:
  push:
    branches: [master]
  pull_request:
    branches: [master]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline for lint, test, build"
```

---

### Task 11: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

Structure:
1. Title + tagline + badges (npm version, license, CI status)
2. Quick start: `npx git-poster`
3. Sample output description (placeholder for actual poster image)
4. Features list (5 themes, SVG/PNG, zero-config, filters)
5. Usage examples (basic, theme, date filter, PNG, quiet, stats-only)
6. CLI reference table (all flags)
7. Themes section with names and descriptions
8. How it works (3-layer pipeline)
9. Contributing
10. License

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage, themes, and CLI reference"
```

---

### Task 12: Full Integration Test

**Files:** None new — run the built CLI against a real repo.

- [ ] **Step 1: Build the project**

Run: `npm run build`

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Run the CLI against own repo**

Run: `node dist/index.js --repo . --theme dark -o examples/dark.svg`
Run: `node dist/index.js --repo . --theme light -o examples/light.svg`
Run: `node dist/index.js --repo . --theme midnight -o examples/midnight.svg`
Run: `node dist/index.js --repo . --theme forest -o examples/forest.svg`
Run: `node dist/index.js --repo . --theme ocean -o examples/ocean.svg`

Expected: 5 SVG files in `examples/` directory, each valid and viewable in a browser.

- [ ] **Step 5: Run --stats-only**

Run: `node dist/index.js --repo . --stats-only`
Expected: Terminal summary printed, no file created

- [ ] **Step 6: Commit examples**

```bash
git add examples/
git commit -m "feat: add example poster SVGs for all 5 themes"
```

---

## Summary

| Task | Module | Type | Dependencies |
|------|--------|------|-------------|
| 1 | Scaffold | Setup | None |
| 2 | types.ts | Types | None |
| 3 | themes.ts | Core | types.ts |
| 4 | analyzer.ts | Core | types.ts |
| 5 | git.ts | Core | types.ts |
| 6 | poster.ts | Output | types.ts, themes.ts |
| 7 | terminal.ts | Output | types.ts |
| 8 | export.ts | Output | None |
| 9 | index.ts | CLI | All modules |
| 10 | CI | Infra | None |
| 11 | README | Docs | None |
| 12 | Integration | Test | All |

**Total: 12 tasks, ~12 commits**
