import type { AnalyzedData, PosterOptions } from './types.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  return n.toLocaleString('en-US');
}

function formatShortNumber(n: number): string {
  if (n >= 10_000) {
    return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return n.toLocaleString('en-US');
}

function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

function getHeatmapLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

// ─── Section renderers ───────────────────────────────────────────────────────

function renderHeader(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const pad = 40 * sx;
  const yBase = 38 * sy;
  const repoName = truncate(escapeXml(data.repoName), 40);
  const desc = data.description ? truncate(escapeXml(data.description), 80) : '';

  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  let out = '';

  // Repo name (left)
  out += `<text x="${pad}" y="${yBase}" font-family="${FONT_MAIN}" font-size="${22 * sy}" `;
  out += `font-weight="700" fill="${theme.foreground}">${repoName}</text>\n`;

  // git-poster branding (right, muted)
  const rightX = (opts.width - pad);
  out += `<text x="${rightX}" y="${yBase}" font-family="${FONT_MAIN}" font-size="${14 * sy}" `;
  out += `fill="${theme.foregroundMuted}" text-anchor="end">git-poster</text>\n`;

  // Description below
  if (desc) {
    out += `<text x="${pad}" y="${yBase + 22 * sy}" font-family="${FONT_MAIN}" `;
    out += `font-size="${13 * sy}" fill="${theme.foregroundMuted}">${desc}</text>\n`;
  }

  // Separator line
  const lineY = 68 * sy;
  out += `<line x1="${pad}" y1="${lineY}" x2="${opts.width - pad}" y2="${lineY}" `;
  out += `stroke="${theme.border}" stroke-width="1"/>\n`;

  return out;
}

function renderHeatmap(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;
  const FONT_MONO = `'SF Mono', 'Fira Code', 'Cascadia Code', monospace`;

  const CELL = 12 * Math.min(sx, sy);
  const GAP = 3 * Math.min(sx, sy);
  const STEP = CELL + GAP;

  const LEFT_LABELS_W = 30 * sx;
  const TOP_LABELS_H = 16 * sy;
  const heatX = 40 * sx + LEFT_LABELS_W;
  const heatY = 80 * sy + TOP_LABELS_H;

  // Build a 52-week grid anchored to lastCommitDate going back 52 weeks
  const lastDate = new Date(data.lastCommitDate);
  // Move to end of that week (Saturday)
  const dayOfWeek = lastDate.getUTCDay(); // 0=Sun..6=Sat
  const endSat = new Date(lastDate);
  endSat.setUTCDate(lastDate.getUTCDate() + (6 - dayOfWeek));

  // Start = 52 weeks back from end Saturday, land on Sunday
  const startSun = new Date(endSat);
  startSun.setUTCDate(endSat.getUTCDate() - 52 * 7 + 1);

  const dailyMap = data.dailyCommits;
  const maxCount = Math.max(0, ...Array.from(dailyMap.values()));

  let out = '';

  // Day labels: Mon (row 1), Wed (row 3), Fri (row 5)
  const dayLabels: [number, string][] = [[1, 'Mon'], [3, 'Wed'], [5, 'Fri']];
  for (const [row, label] of dayLabels) {
    const ly = heatY + row * STEP + CELL / 2 + 4 * sy;
    out += `<text x="${heatX - 4 * sx}" y="${ly}" font-family="${FONT_MAIN}" `;
    out += `font-size="${9 * sy}" fill="${theme.foregroundMuted}" text-anchor="end">${label}</text>\n`;
  }

  // Render cells column by column (week by week)
  const monthLabelsSeen = new Set<string>();
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let col = 0; col < 52; col++) {
    for (let row = 0; row < 7; row++) {
      const offset = col * 7 + row;
      const cellDate = new Date(startSun);
      cellDate.setUTCDate(startSun.getUTCDate() + offset);

      const key = cellDate.toISOString().slice(0, 10);
      const count = dailyMap.get(key) ?? 0;
      const level = getHeatmapLevel(count, maxCount);
      const fill = theme.heatmap[level];

      const cx = heatX + col * STEP;
      const cy = heatY + row * STEP;

      out += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" `;
      out += `width="${CELL.toFixed(1)}" height="${CELL.toFixed(1)}" `;
      out += `rx="2" ry="2" fill="${fill}"/>\n`;

      // Month label on first row, first time this month appears
      if (row === 0) {
        const monthKey = `${cellDate.getUTCFullYear()}-${cellDate.getUTCMonth()}`;
        if (!monthLabelsSeen.has(monthKey)) {
          monthLabelsSeen.add(monthKey);
          const mlY = heatY - 4 * sy;
          out += `<text x="${cx.toFixed(1)}" y="${mlY.toFixed(1)}" `;
          out += `font-family="${FONT_MONO}" font-size="${9 * sy}" `;
          out += `fill="${theme.foregroundMuted}">${MONTH_NAMES[cellDate.getUTCMonth()]}</text>\n`;
        }
      }
    }
  }

  // "Last 52 weeks" note
  const noteY = heatY + 7 * STEP + 8 * sy;
  out += `<text x="${heatX}" y="${noteY.toFixed(1)}" font-family="${FONT_MAIN}" `;
  out += `font-size="${9 * sy}" fill="${theme.foregroundMuted}">Last 52 weeks</text>\n`;

  return out;
}

function renderStats(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  const sectionY = 235 * sy;
  const pad = 40 * sx;
  const cardW = (opts.width - pad * 2 - 20 * sx * 2) / 3;
  const cardH = 40 * sy;
  const cardRx = 6;

  const cards: Array<{ label: string; value: string }> = [
    { label: 'Commits',      value: formatStatNumber(data.totalCommits) },
    { label: 'Authors',      value: formatStatNumber(data.totalAuthors) },
    { label: 'Files',        value: formatStatNumber(data.totalFiles) },
    { label: 'First Commit', value: formatDate(data.firstCommitDate) },
    { label: 'Last Commit',  value: formatDate(data.lastCommitDate) },
    { label: 'Active Days',  value: formatStatNumber(data.activeDays) },
  ];

  let out = '';

  for (let i = 0; i < cards.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = pad + col * (cardW + 20 * sx);
    const cy = sectionY + row * (cardH + 10 * sy);

    out += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" `;
    out += `width="${cardW.toFixed(1)}" height="${cardH.toFixed(1)}" `;
    out += `rx="${cardRx}" ry="${cardRx}" fill="${theme.cardBackground}" `;
    out += `stroke="${theme.border}" stroke-width="1"/>\n`;

    const labelY = cy + 14 * sy;
    const valueY = cy + 32 * sy;
    const textX = cx + 12 * sx;

    out += `<text x="${textX.toFixed(1)}" y="${labelY.toFixed(1)}" `;
    out += `font-family="${FONT_MAIN}" font-size="${9 * sy}" `;
    out += `fill="${theme.foregroundMuted}">${cards[i]!.label}</text>\n`;

    out += `<text x="${textX.toFixed(1)}" y="${valueY.toFixed(1)}" `;
    out += `font-family="${FONT_MAIN}" font-size="${18 * sy}" font-weight="700" `;
    out += `fill="${theme.foreground}">${escapeXml(cards[i]!.value)}</text>\n`;
  }

  return out;
}

function renderCharts(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  const sectionY = 358 * sy;
  const sectionH = 140 * sy;
  const pad = 40 * sx;
  const halfW = (opts.width - pad * 2 - 30 * sx) / 2;

  let out = '';

  // ── Left: 24-bar hourly activity ──────────────────────────────────────────
  const hourlyData = data.hourlyActivity;
  const maxHourly = Math.max(1, ...hourlyData);
  const barW = (halfW - 10 * sx) / 24;
  const chartH = sectionH - 30 * sy;
  const hourlyBaseY = sectionY + sectionH - 10 * sy;

  // Section label
  out += `<text x="${pad}" y="${sectionY - 6 * sy}" font-family="${FONT_MAIN}" `;
  out += `font-size="${11 * sy}" fill="${theme.foregroundMuted}">Hourly Activity</text>\n`;

  for (let h = 0; h < 24; h++) {
    const count = hourlyData[h] ?? 0;
    const barH = (count / maxHourly) * chartH;
    const bx = pad + h * barW;
    const by = hourlyBaseY - barH;

    out += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" `;
    out += `width="${(barW - 1 * sx).toFixed(1)}" height="${barH.toFixed(1)}" `;
    out += `rx="1" fill="${theme.accent}" opacity="0.85"/>\n`;
  }

  // Hour labels: 0h, 6h, 12h, 18h, 23h
  for (const h of [0, 6, 12, 18, 23]) {
    const lx = pad + h * barW + barW / 2;
    out += `<text x="${lx.toFixed(1)}" y="${(hourlyBaseY + 14 * sy).toFixed(1)}" `;
    out += `font-family="${FONT_MAIN}" font-size="${9 * sy}" fill="${theme.foregroundMuted}" text-anchor="middle">${h}h</text>\n`;
  }

  // ── Right: stacked language bar + legend ──────────────────────────────────
  const rightX = pad + halfW + 30 * sx;
  const langs = data.languages.filter(l => l.percentage >= 1).slice(0, 8);

  out += `<text x="${rightX}" y="${sectionY - 6 * sy}" font-family="${FONT_MAIN}" `;
  out += `font-size="${11 * sy}" fill="${theme.foregroundMuted}">Languages</text>\n`;

  // Stacked bar
  const stackBarH = 12 * sy;
  const stackBarY = sectionY + 8 * sy;
  let stackX = rightX;
  const stackW = halfW;

  for (const lang of langs) {
    const segW = (lang.percentage / 100) * stackW;
    if (segW < 1) continue;
    out += `<rect x="${stackX.toFixed(1)}" y="${stackBarY.toFixed(1)}" `;
    out += `width="${segW.toFixed(1)}" height="${stackBarH.toFixed(1)}" `;
    out += `fill="${lang.color}"/>\n`;
    stackX += segW;
  }

  // Legend
  const legendStartY = stackBarY + stackBarH + 14 * sy;
  const legendColW = halfW / 2;
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]!;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = rightX + col * legendColW;
    const ly = legendStartY + row * 18 * sy;

    out += `<rect x="${lx.toFixed(1)}" y="${(ly - 8 * sy).toFixed(1)}" `;
    out += `width="${10 * sx}" height="${10 * sy}" rx="2" fill="${lang.color}"/>\n`;

    const textX = lx + 14 * sx;
    out += `<text x="${textX.toFixed(1)}" y="${ly.toFixed(1)}" `;
    out += `font-family="${FONT_MAIN}" font-size="${11 * sy}" fill="${theme.foreground}">`;
    out += `${escapeXml(lang.name)} `;
    out += `<tspan fill="${theme.foregroundMuted}">${lang.percentage.toFixed(0)}%</tspan>`;
    out += `</text>\n`;
  }

  return out;
}

function renderContributors(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  const sectionY = 508 * sy;
  const pad = 40 * sx;
  const barMaxW = opts.width - pad * 2 - 100 * sx;

  const contributors = data.topContributors.slice(0, 5);
  const maxCommits = Math.max(1, ...contributors.map(c => c.commits));

  let out = '';

  out += `<text x="${pad}" y="${sectionY - 6 * sy}" font-family="${FONT_MAIN}" `;
  out += `font-size="${11 * sy}" fill="${theme.foregroundMuted}">Top Contributors</text>\n`;

  for (let i = 0; i < contributors.length; i++) {
    const c = contributors[i]!;
    const rowY = sectionY + i * 32 * sy;
    const nameW = 150 * sx;
    const barW = (c.commits / maxCommits) * (barMaxW - nameW);
    const barH = 14 * sy;
    const barY = rowY + 4 * sy;
    const color = theme.chartColors[i % theme.chartColors.length] ?? theme.accent;

    // Name
    out += `<text x="${pad}" y="${rowY + 14 * sy}" font-family="${FONT_MAIN}" `;
    out += `font-size="${11 * sy}" fill="${theme.foreground}">${escapeXml(truncate(c.name, 30))}</text>\n`;

    // Bar
    const bx = pad + nameW;
    out += `<rect x="${bx.toFixed(1)}" y="${barY.toFixed(1)}" `;
    out += `width="${Math.max(2, barW).toFixed(1)}" height="${barH.toFixed(1)}" `;
    out += `rx="2" fill="${color}" opacity="0.85"/>\n`;

    // Count + percentage
    const statX = bx + Math.max(2, barW) + 8 * sx;
    out += `<text x="${statX.toFixed(1)}" y="${rowY + 14 * sy}" `;
    out += `font-family="${FONT_MAIN}" font-size="${11 * sy}" fill="${theme.foregroundMuted}">`;
    out += `${escapeXml(formatShortNumber(c.commits))} (${c.percentage.toFixed(0)}%)</text>\n`;
  }

  return out;
}

function renderInsights(
  data: AnalyzedData,
  opts: PosterOptions,
  sx: number,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  const sectionY = 680 * sy;
  const pad = 40 * sx;

  let out = '';

  out += `<text x="${pad}" y="${sectionY - 6 * sy}" font-family="${FONT_MAIN}" `;
  out += `font-size="${11 * sy}" fill="${theme.foregroundMuted}">Insights</text>\n`;

  const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const insights: string[] = [];

  if (data.busiestDay) {
    insights.push(`Busiest day: ${data.busiestDay.date} (${formatStatNumber(data.busiestDay.count)} commits)`);
  }
  if (data.busiestHour) {
    const h = data.busiestHour.hour;
    const label = `${h.toString().padStart(2, '0')}:00`;
    insights.push(`Most active hour: ${label} (${formatStatNumber(data.busiestHour.count)} commits)`);
  }

  // Busiest weekday
  const maxWeekday = Math.max(...data.weekdayActivity);
  if (maxWeekday > 0) {
    const weekdayIdx = data.weekdayActivity.indexOf(maxWeekday);
    insights.push(`Busiest weekday: ${WEEKDAY_NAMES[weekdayIdx]}`);
  }

  // Avg commits per active day
  if (data.activeDays > 0) {
    const avg = (data.totalCommits / data.activeDays).toFixed(1);
    insights.push(`Avg commits/active day: ${avg}`);
  }

  for (let i = 0; i < insights.length && i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ix = pad + col * (opts.width - pad * 2) / 2;
    const iy = sectionY + 8 * sy + row * 20 * sy;

    out += `<text x="${ix}" y="${iy}" font-family="${FONT_MAIN}" `;
    out += `font-size="${10 * sy}" fill="${theme.foreground}">${escapeXml(insights[i]!)}</text>\n`;
  }

  return out;
}

function renderFooter(
  opts: PosterOptions,
  sy: number,
): string {
  const { theme } = opts;
  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  const footerY = 768 * sy;
  const cx = opts.width / 2;

  return (
    `<text x="${cx}" y="${footerY}" font-family="${FONT_MAIN}" ` +
    `font-size="${11 * sy}" fill="${theme.foregroundMuted}" text-anchor="middle">` +
    `Generated with git-poster</text>\n`
  );
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export function generatePoster(data: AnalyzedData, opts: PosterOptions): string {
  const { width, height, theme } = opts;
  const sx = width / 1200;
  const sy = height / 800;

  const FONT_MAIN = `'Segoe UI', system-ui, -apple-system, sans-serif`;

  let svg = '';

  svg += `<?xml version="1.0" encoding="UTF-8"?>\n`;
  svg += `<svg xmlns="http://www.w3.org/2000/svg" `;
  svg += `width="${width}" height="${height}" `;
  svg += `viewBox="0 0 ${width} ${height}" `;
  svg += `font-family="${FONT_MAIN}">\n`;

  // Background
  svg += `<rect width="${width}" height="${height}" fill="${theme.background}"/>\n`;

  svg += renderHeader(data, opts, sx, sy);
  svg += renderHeatmap(data, opts, sx, sy);
  svg += renderStats(data, opts, sx, sy);
  svg += renderCharts(data, opts, sx, sy);
  svg += renderContributors(data, opts, sx, sy);
  svg += renderInsights(data, opts, sx, sy);
  svg += renderFooter(opts, sy);

  svg += `</svg>`;

  return svg;
}
