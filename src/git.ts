import simpleGit, { type SimpleGit, type LogResult } from 'simple-git';
import path from 'node:path';
import fs from 'node:fs';
import type { GitData, CommitInfo, AuthorStat, FileStat } from './types.js';

export async function collectGitData(
  repoPath: string,
  options?: { branch?: string; since?: string; until?: string; author?: string },
): Promise<GitData> {
  const git: SimpleGit = simpleGit(repoPath);

  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error('Not a git repository. Run this inside a git repo.');
  }

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

  const commits: CommitInfo[] = log.all.map(entry => ({
    hash: entry.hash,
    date: new Date(entry.date),
    author: entry.author_name,
    message: entry.message,
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
  }));

  const lsFilesOutput = await git.raw(['ls-files']);
  const fileList = lsFilesOutput.trim().split('\n').filter(Boolean);

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

  let description: string | undefined;
  try {
    const pkgPath = path.join(repoPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { description?: string };
    if (pkg.description) description = pkg.description;
  } catch {
    // No package.json — fine
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
