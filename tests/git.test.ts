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

  fs.writeFileSync(path.join(dir, 'index.ts'), 'console.log("hello");');
  fs.writeFileSync(path.join(dir, 'style.css'), 'body {}');
  fs.writeFileSync(path.join(dir, 'Makefile'), 'all: build');

  await git.add('.');
  // Set both author and committer date so --since/--until filters work on committer date
  await simpleGit(dir)
    .env({ ...process.env, GIT_AUTHOR_DATE: '2025-01-15T10:00:00Z', GIT_COMMITTER_DATE: '2025-01-15T10:00:00Z' })
    .commit('initial commit');

  fs.writeFileSync(path.join(dir, 'utils.ts'), 'export const x = 1;');
  await git.add('.');
  await simpleGit(dir)
    .env({ ...process.env, GIT_AUTHOR_DATE: '2025-02-20T14:00:00Z', GIT_COMMITTER_DATE: '2025-02-20T14:00:00Z' })
    .commit('add utils');

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
    await expect(collectGitData(emptyDir)).rejects.toThrow();
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('respects --since date filter', async () => {
    const data = await collectGitData(tempDir, { since: '2025-02-01' });
    expect(data.totalCommits).toBe(1);
    expect(data.commits[0].message).toContain('add utils');
  });

  it('respects --author filter', async () => {
    const data = await collectGitData(tempDir, { author: 'Test User' });
    expect(data.totalCommits).toBe(2);
  });
});
