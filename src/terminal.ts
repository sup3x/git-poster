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
