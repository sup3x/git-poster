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

  // Build daily commit map
  const dailyCommits = new Map<string, number>();
  for (const c of commits) {
    const key = toDateKey(c.date);
    dailyCommits.set(key, (dailyCommits.get(key) ?? 0) + 1);
  }

  // Hourly activity (UTC hours, 0–23)
  const hourlyActivity = new Array(24).fill(0) as number[];
  for (const c of commits) {
    hourlyActivity[c.date.getUTCHours()]++;
  }

  // Weekday activity (UTC day, 0=Sunday … 6=Saturday)
  const weekdayActivity = new Array(7).fill(0) as number[];
  for (const c of commits) {
    weekdayActivity[c.date.getUTCDay()]++;
  }

  // Inclusive day span between first and last commit
  let activeDays = 0;
  if (commits.length > 0) {
    const msPerDay = 86_400_000;
    activeDays =
      Math.floor(
        (data.lastCommitDate.getTime() - data.firstCommitDate.getTime()) / msPerDay,
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

  // Language aggregation — merge by mapped name, unmapped → 'Other'
  const langCounts = new Map<string, number>();
  let totalFileCount = 0;
  for (const f of files) {
    totalFileCount += f.count;
    const lang = EXTENSION_MAP[f.extension] ?? 'Other';
    langCounts.set(lang, (langCounts.get(lang) ?? 0) + f.count);
  }

  const languages: LanguageStat[] = Array.from(langCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalFileCount > 0 ? (count / totalFileCount) * 100 : 0,
      color: LANGUAGE_COLORS[name] ?? FALLBACK_COLOR,
    }));

  // Top 5 contributors by commit count
  const sortedAuthors = [...authors].sort((a, b) => b.commits - a.commits);
  const topContributors: ContributorStat[] = sortedAuthors.slice(0, 5).map(a => ({
    name: a.name,
    commits: a.commits,
    percentage:
      data.totalCommits > 0 ? (a.commits / data.totalCommits) * 100 : 0,
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
