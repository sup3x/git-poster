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
