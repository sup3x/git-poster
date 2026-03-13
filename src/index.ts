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
