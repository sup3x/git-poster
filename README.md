# git-poster

**Turn your Git history into a beautiful poster.**

[![npm version](https://img.shields.io/npm/v/git-poster.svg?style=flat-square)](https://www.npmjs.com/package/git-poster)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/sup3x/git-poster/ci.yml?branch=master&style=flat-square&label=CI)](https://github.com/sup3x/git-poster/actions)
[![Node >=18](https://img.shields.io/node/v/git-poster.svg?style=flat-square)](https://nodejs.org)

A zero-config CLI that parses your Git log and renders a contribution heatmap poster as an SVG or PNG — no account required, fully local.

---

## Quick Start

```bash
npx git-poster
```

That's it. Run from any Git repository and get `git-poster.svg` in the current directory.

---

## Features

- **5 built-in themes** — dark, light, midnight, forest, ocean
- **SVG and PNG output** — crisp at any resolution; PNG via optional `sharp`
- **Zero config** — sensible defaults, works out of the box
- **Flexible filters** — by author, branch, date range
- **Terminal summary** — commit stats printed to stderr before the file is written
- **Requires only Node 18+** — no external dependencies beyond npm

---

## Usage Examples

**Basic — generate poster from cwd:**
```bash
npx git-poster
```

**Choose a theme:**
```bash
npx git-poster --theme midnight
```

**Filter by date range:**
```bash
npx git-poster --since 2024-01-01 --until 2024-12-31
```

**Export as PNG:**
```bash
npm install sharp   # one-time optional peer dep
npx git-poster --png -o poster.png
```

**Quiet mode (no terminal output):**
```bash
npx git-poster -q -o ~/Desktop/poster.svg
```

**Stats only (no file written):**
```bash
npx git-poster --stats-only
```

**Specific repo, branch, and author:**
```bash
npx git-poster --repo ~/projects/myapp --branch develop --author "Kerim Gulen"
```

---

## CLI Reference

| Flag | Description | Default |
|---|---|---|
| `--repo <path>` | Repository path | cwd |
| `-o, --output <file>` | Output file path | `git-poster.svg` |
| `--png` | Export as PNG (requires `sharp`) | — |
| `--theme <name>` | Color theme | `dark` |
| `--branch <name>` | Specific branch | all branches |
| `--since <date>` | Start date (`YYYY-MM-DD`) | — |
| `--until <date>` | End date (`YYYY-MM-DD`) | — |
| `--author <name>` | Filter commits by author name | — |
| `--width <px>` | Poster width in pixels | `1200` |
| `--height <px>` | Poster height in pixels | `800` |
| `-q, --quiet` | Suppress terminal output | — |
| `--stats-only` | Print stats only, no file written | — |
| `-V, --version` | Print version | — |
| `-h, --help` | Show help | — |

---

## Themes

| Name | Background | Heatmap | Style |
|---|---|---|---|
| `dark` *(default)* | Dark gray | Green | GitHub dark mode |
| `light` | Off-white | Green | GitHub light mode |
| `midnight` | Deep navy | Blue tones | Late-night coding |
| `forest` | Dark green | Natural greens | Organic, muted |
| `ocean` | Dark blue-teal | Teal/cyan | Deep sea |

```bash
npx git-poster --theme ocean
```

---

## How It Works

```
CLI (commander)
  └─ Core
       ├─ git (simple-git)       — parse commit log
       └─ analyzer               — aggregate by day, compute heatmap buckets
  └─ Output
       ├─ poster (SVG builder)   — render contribution grid + metadata
       ├─ terminal (chalk)       — print stats table to stderr
       └─ export (sharp)         — optional raster conversion to PNG
```

1. **CLI** parses flags and resolves the repository path.
2. **Core** reads the Git log via `simple-git`, groups commits by calendar day, and maps counts into heatmap intensity buckets.
3. **Output** builds an SVG string from scratch (no external renderer), optionally converts it to PNG with `sharp`, and prints a summary table to the terminal.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-change`
3. Make your changes and add tests under `tests/`.
4. Open a pull request against `main`.

All contributions are welcome — new themes, output formats, performance improvements, or bug fixes.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Made by [Kerim Gulen](https://github.com/sup3x)*
