# git-poster — Design Specification

## Overview

git-poster is a CLI tool that turns any Git repository's commit history into a beautiful, shareable SVG/PNG poster. One command, zero config, instant visual.

**Problem:** Your repo's history is just a wall of `git log`. There's no easy way to visualize contributions. GitHub's contribution graph is GitHub-only and not repo-specific.

**Solution:** `npx git-poster` — beautiful poster with 5 themes, SVG output (universal) + optional PNG, zero-install via npx.

**Target:** Developers who want to visualize and share their project's git history.

---

## Tech Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Runtime | Node.js >= 18 | Cross-platform, large ecosystem |
| Language | TypeScript (strict) | Type safety, developer experience |
| CLI Framework | commander | Lightweight, widely used |
| Git Client | simple-git | Safer than child_process, typed API |
| Colors | chalk | De facto standard for terminal colors |
| Spinner | ora | Loading indicator during analysis |
| Tables | cli-table3 | Formatted terminal tables |
| SVG | Manual string builder | Zero dependency, full control |
| PNG | sharp (optional peer dep) | Only if user requests --png |
| Build | tsup | Fast ESM bundler with shebang support |
| Test | vitest | Fast, TypeScript-native |

---

## Architecture

3-Layer Pipeline:

```
CLI Layer (commander) → Core Layer (git + analyzer) → Output Layer (poster + terminal + export)
```

- **CLI Layer:** Parse args, validate input, orchestrate core + output
- **Core Layer:** git (data collection), analyzer (statistics) — pure functions where possible
- **Output Layer:** poster (SVG generation), terminal (console display), export (file I/O)

Data flow: `GitData` → analyzer → `AnalyzedData` → poster/terminal → SVG string / terminal output

---

## Project Structure

```
git-poster/
├── src/
│   ├── index.ts              # CLI entry point (commander setup)
│   ├── git.ts                # Git log parsing and data collection
│   ├── analyzer.ts           # Raw git data → statistics
│   ├── poster.ts             # SVG poster generator (main render engine)
│   ├── themes.ts             # Color themes (dark, light, midnight, forest, ocean)
│   ├── terminal.ts           # Terminal output (summary table + mini preview)
│   ├── export.ts             # SVG/PNG file export
│   └── types.ts              # TypeScript type definitions
├── tests/
│   ├── git.test.ts
│   ├── analyzer.test.ts
│   ├── poster.test.ts
│   └── themes.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .gitignore
├── .npmignore
├── LICENSE (MIT)
├── README.md
└── .github/workflows/ci.yml
```

---

## Type Definitions

```typescript
// ── Git Data Types ──

export interface GitData {
  repoName: string;           // from directory name or remote URL
  description?: string;       // from package.json description or empty
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
  totalFiles: number;                     // count of tracked files from git ls-files
  firstCommitDate: Date;
  lastCommitDate: Date;
  activeDays: number;                     // calendar days between first and last commit (inclusive)
  busiestDay: { date: string; count: number } | null;  // null when 0 commits
  busiestHour: { hour: number; count: number } | null;  // null when 0 commits
  dailyCommits: Map<string, number>;     // "YYYY-MM-DD" → count
  hourlyActivity: number[];               // index 0-23, value = count
  weekdayActivity: number[];              // index 0-6 (Sun-Sat), value = count
  languages: LanguageStat[];
  topContributors: ContributorStat[];
}

export interface LanguageStat {
  name: string;
  count: number;
  percentage: number;
  color: string;                          // hex color for chart
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
  heatmap: string[];          // 5 levels: none → max
  chartColors: string[];
  border: string;
  cardBackground: string;
}

// ── Poster Options ──

export interface PosterOptions {
  width: number;              // default: 1200
  height: number;             // default: 800
  theme: Theme;
}

// ── CLI Options ──

export interface CliOptions {
  repo: string;               // default: cwd
  output: string;             // default: "git-poster.svg"
  png: boolean;               // default: false
  theme: string;              // default: "dark"
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

---

## Core Module Specifications

### git.ts — Git Data Collector

```typescript
export async function collectGitData(
  repoPath: string,
  options?: { branch?: string; since?: string; until?: string; author?: string }
): Promise<GitData>
```

- Uses `simple-git` library for all git operations
- `log()` with `--no-merges` for commit history. When `--branch` is specified, pass that branch name to `log()`. When no `--branch`, use `--all` to include all branches.
- `raw(['ls-files'])` for file listing (current HEAD)
- Repo name: extract from `remote.origin.url` (strip `.git` suffix, take last path segment) or fall back to directory name (`path.basename(repoPath)`)
- Description: try reading `package.json` description from repo root; if no `package.json` or no description field, leave as `undefined`
- Throws descriptive error if not a git repo or repo has no commits

### analyzer.ts — Statistics Calculator

```typescript
export function analyzeGitData(data: GitData): AnalyzedData
```

Pure function. No I/O.

- Groups commits by day (YYYY-MM-DD key) for heatmap
- Groups commits by hour (0-23) for hourly activity chart
- Groups commits by weekday (0-6) for weekly distribution
- Maps file extensions to language names using `EXTENSION_MAP`; unmapped extensions go into "Other"
- Calculates top 5 contributors by commit count
- Calculates `activeDays`: calendar days between first and last commit dates (inclusive). For a single commit, `activeDays = 1`. For 0 commits, `activeDays = 0`.
- Finds busiest day and busiest hour. Returns `null` for both when there are 0 commits.
- `totalFiles`: count of entries from `GitData.files` (sum of all `FileStat.count` values)

**Edge cases:**
- **0 commits:** `busiestDay = null`, `busiestHour = null`, `activeDays = 0`, all activity arrays are zeros, `languages` and `topContributors` are empty arrays
- **1 commit:** `activeDays = 1`, heatmap has exactly one colored cell

**Extension to language mapping:**

```typescript
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
```

**Language colors** (for chart rendering):

```typescript
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

// Fallback for unmapped languages: '#8b8b8b' (gray)
```

### poster.ts — SVG Poster Generator

```typescript
export function generatePoster(
  data: AnalyzedData,
  options: PosterOptions
): string
```

Pure function. Returns SVG string.

**SVG built manually with string concatenation — NO external SVG library.**

**Layout (1200x800 default, top to bottom):**

1. **Header** (y: 0-70) — Repo name (left), "git-poster" branding (right, muted), description below name
2. **Heatmap** (y: 70-230) — GitHub-style contribution graph. 52 weeks × 7 days grid. Each cell: 12×12px, 3px gap. Color intensity by commit count (5 levels from theme.heatmap). **Time anchor:** last commit date is the rightmost column; grid extends 52 weeks backwards. If `--since`/`--until` narrows the window to fewer than 52 weeks, render only the available weeks (grid shrinks horizontally). **Level thresholds:** divide max daily commit count into 4 equal quartiles — level 0 = no commits (heatmap[0]), level 1 = 1–Q1, level 2 = Q1+1–Q2, level 3 = Q2+1–Q3, level 4 = Q3+1–max (heatmap[4]). If max is 0, all cells are level 0.
3. **Stats Cards** (y: 230-350) — Two rows of 3 cards each:
   - Row 1: Commits, Authors, Files
   - Row 2: First Commit, Last Commit, Active Days
   - Each card: rounded rect (rx="8") with label + value
4. **Charts** (y: 350-500) — Two-column layout:
   - Left: Hourly Activity (24-bar vertical chart)
   - Right: Language Breakdown (horizontal stacked bar with legend)
5. **Contributors** (y: 500-700) — Top 5 contributors with horizontal bar chart
6. **Footer** (y: 750-800) — "Generated with git-poster" text, muted

**Note:** The y:700-750 range is padding/breathing room between contributors and footer.

**SVG details:**
- Font: `font-family="'Segoe UI', system-ui, -apple-system, sans-serif"`
- Monospace: `font-family="'SF Mono', 'Fira Code', 'Cascadia Code', monospace"`
- All rects with `rx="8"` for rounded corners
- 24px spacing between sections
- Numbers formatted with commas (1,247) or short form (1.2k)
- Valid XML: proper `<?xml version="1.0" encoding="UTF-8"?>` declaration, `xmlns="http://www.w3.org/2000/svg"`, viewBox attribute

### themes.ts — Color Themes

5 built-in themes:

1. **dark** (default) — GitHub dark mode inspired
   - bg: #0d1117, fg: #e6edf3, fgMuted: #8b949e, accent: #58a6ff
   - heatmap: [#161b22, #0e4429, #006d32, #26a641, #39d353]
   - chartColors: [#58a6ff, #3fb950, #d29922, #f85149, #bc8cff, #39d353, #e3b341, #f0883e]
   - border: #30363d, cardBg: #161b22

2. **light** — GitHub light mode inspired
   - bg: #ffffff, fg: #1f2328, fgMuted: #656d76, accent: #0969da
   - heatmap: [#ebedf0, #9be9a8, #40c463, #30a14e, #216e39]
   - chartColors: [#0969da, #1a7f37, #9a6700, #cf222e, #8250df, #2da44e, #bf8700, #bc4c00]
   - border: #d0d7de, cardBg: #f6f8fa

3. **midnight** — Deep navy, blue tones
   - bg: #0a0e27, fg: #a2b2d0, fgMuted: #5a6a8a, accent: #6c5ce7
   - heatmap: [#141832, #1e2a6e, #3b4fad, #5b7cfa, #8fa7ff]
   - chartColors: [#6c5ce7, #00cec9, #fdcb6e, #e17055, #a29bfe, #55efc4, #ffeaa7, #fab1a0]
   - border: #1e2a4a, cardBg: #0f1535

4. **forest** — Dark green, natural
   - bg: #0b1a0b, fg: #b8d4b8, fgMuted: #5a8a5a, accent: #4caf50
   - heatmap: [#132413, #1b4d1b, #2d7a2d, #4caf4c, #7bc67b]
   - chartColors: [#4caf50, #81c784, #aed581, #dce775, #fff176, #ffb74d, #ff8a65, #a1887f]
   - border: #1e3a1e, cardBg: #0f220f

5. **ocean** — Dark blue-teal
   - bg: #0a192f, fg: #8892b0, fgMuted: #4a5568, accent: #64ffda
   - heatmap: [#112240, #1a3a5c, #2a6496, #45a5c4, #64ffda]
   - chartColors: [#64ffda, #7e57c2, #ffd54f, #ff7043, #4dd0e1, #81c784, #ffb74d, #f06292]
   - border: #1e3a5f, cardBg: #112240

`chartColors` are used as fallback palette for the language breakdown chart when `LANGUAGE_COLORS` doesn't have a mapping. Languages are assigned colors from `LANGUAGE_COLORS` first, then from `chartColors` in order for any remaining.

```typescript
export function getTheme(name: string): Theme
export function getThemeNames(): string[]
```

---

## Output Module Specifications

### terminal.ts — Terminal Output

Renders summary to stderr with chalk colors and ora spinner:

```
  git-poster — repo-name

  Analyzing git history... (spinner)

  ──────────────────────────────────────────
  Overview
  ──────────────────────────────────────────

  Total Commits     1,247
  Contributors      12
  Files             342
  Active Days       847
  First Commit      Jan 15, 2024
  Last Commit       Mar 12, 2026

  ──────────────────────────────────────────
  Top Contributors
  ──────────────────────────────────────────

  @kerim        ████████████████████  523 (41.9%)
  @ahmet        ████████████          312 (25.0%)

  ──────────────────────────────────────────
  Languages
  ──────────────────────────────────────────

  TypeScript    ████████████████  62.3%
  JavaScript    ████████          18.7%

  ✔ Poster saved to git-poster.svg
```

- Auto-disabled on non-TTY and `--quiet`
- `--stats-only` shows terminal output but skips poster generation

### export.ts — File Export

```typescript
export async function saveSvg(svg: string, outputPath: string): Promise<void>
export async function savePng(svg: string, outputPath: string, scale?: number): Promise<void>
```

- SVG: write string to file (UTF-8 encoding)
- PNG: dynamic `import('sharp')`, convert SVG buffer to PNG. Default `scale = 2` (2x resolution for crisp output).
- If sharp not installed and `--png` requested: friendly error message suggesting `npm install -g sharp`

---

## CLI Specification

### Usage

```bash
git-poster [options]
```

### Options

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--repo <path>` | | Repository path | cwd |
| `--output` | `-o` | Output file path | git-poster.svg |
| `--png` | | Export as PNG (requires sharp) | false |
| `--theme <name>` | | Color theme | dark |
| `--branch <name>` | | Analyze specific branch | all |
| `--since <date>` | | Start date (YYYY-MM-DD) | - |
| `--until <date>` | | End date (YYYY-MM-DD) | - |
| `--author <name>` | | Filter by author | - |
| `--width <px>` | | Poster width | 1200 |
| `--height <px>` | | Poster height | 800 |
| `--quiet` | `-q` | No terminal output, only file | false |
| `--stats-only` | | Terminal output only, no file | false |
| `--version` | `-V` | Show version | |

### Output Rules

- Terminal output goes to stderr (pipe-friendly)
- SVG/PNG files written to specified path
- Exit code 0 = success
- Exit code 1 = error (not a git repo, no commits, invalid args)
- `npx git-poster` must work (zero-install)
- **`--quiet` + `--stats-only` conflict:** If both are specified, error with: "Cannot use --quiet and --stats-only together."
- **`--png` without `-o`:** Default output filename becomes `git-poster.png` instead of `git-poster.svg`
- **`--png` with `-o` ending in `.svg`:** Respect the user's `-o` path but change extension to `.png`

---

## Error Handling

No stack traces. Every error has a descriptive message.

| Error | Message |
|-------|---------|
| Not a git repo | "Not a git repository. Run this inside a git repo." |
| No commits | "This repository has no commits yet." |
| Invalid theme | "Unknown theme 'X'. Available: dark, light, midnight, forest, ocean" |
| Sharp not installed | "PNG export requires the 'sharp' package. Install: npm i -g sharp" |
| Write error | "Cannot write to 'path'. Check permissions." |
| Invalid date | "Invalid date format. Use YYYY-MM-DD." |
| Quiet + stats-only | "Cannot use --quiet and --stats-only together." |

---

## Performance

- Large repos (10k+ commits): must complete in seconds
- `simple-git` log with `--max-count` as safety valve for enormous repos
- Default: analyze all commits. If repo has > 50,000 commits, default to last 1 year with warning:
  `"Repository has >50,000 commits. Analyzing last 1 year only. Use --since to override."`
- When `--since`/`--until` are specified by user, they always take precedence over the 50k auto-limit

---

## Testing Strategy

### Unit Tests (pure functions, no git operations)

| Module | Scenarios |
|--------|-----------|
| analyzer | daily grouping, hourly grouping, language mapping, top contributors, active days, busiest day/hour, empty data, single commit |
| poster | valid SVG output, all sections present, theme applied, custom dimensions, special chars escaped in repo name |
| themes | all 5 themes have required fields, getTheme returns correct theme, invalid theme throws |

### Integration Tests (with temporary git repo)

| Module | Scenarios |
|--------|-----------|
| git | collect data from real repo, respect branch filter, respect date filter, handle empty repo error |

---

## Package Details

- **Name:** git-poster
- **Author:** Kerim Gulen
- **License:** MIT
- **Repository:** github.com/sup3x/git-poster
- **Node:** >= 18
- **Module:** ESM
- **Dependencies:** chalk, cli-table3, commander, ora, simple-git
- **Dev Dependencies:** @types/node, tsup, typescript, vitest
- **Optional Peer:** sharp (for PNG export)

### CI

GitHub Actions: ubuntu-latest × 3 Node versions (18, 20, 22). Run lint + test + build on push and PR to master.
