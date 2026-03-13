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

export interface PosterOptions {
  width: number;
  height: number;
  theme: Theme;
}

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
