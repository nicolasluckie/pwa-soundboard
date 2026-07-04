<a name="readme-top"></a>

<h1 align="center">PWA Soundboard</h1>

<p align="center">React + Vite PWA soundboard — dark launchpad grid, instant search, overlapping playback, and offline audio caching. Drop in your own MP3s, update a JSON file, and launch via a tiny Express server. Installable on mobile and desktop.</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Installable-success?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Version](https://img.shields.io/github/v/release/nicolasluckie/pwa-soundboard)](https://github.com/nicolasluckie/pwa-soundboard/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/nicolasluckie/pwa-soundboard/ci-release.yml)](https://github.com/nicolasluckie/pwa-soundboard/actions/workflows/ci-release.yml)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev)

</div>

---

## Features

- **Dark-mode launchpad grid** — visually organized sound buttons with customizable colors
- **Instant search** — filter sounds by name as you type
- **Global volume slider** — adjust overall volume without touching system audio
- **Global stop button** — silence all sounds with one click
- **Overlapping playback** — sounds can play simultaneously; repeated clicks layer the audio
- **Sound upload** — upload audio or video files through the UI; ffmpeg normalizes to MP3 automatically
- **Installable PWA** — works offline with audio caching, installable on mobile and desktop

---

## Tech Stack

| Layer    | Technology                                                      |
| -------- | --------------------------------------------------------------- |
| Frontend | React 18, Vite, Radix UI, vanilla CSS                           |
| Backend  | Node.js, Express                                                |
| PWA      | vite-plugin-pwa, Service Worker                                 |
| Testing  | Vitest (unit), Playwright (e2e)                                 |
| Tooling  | Husky, lint-staged, commitlint, Commitizen, gitleaks, git-cliff |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22
- npm
- Docker (optional, for containerized deployment)
- [gitleaks](https://github.com/gitleaks/gitleaks) — for pre-commit secret scanning (`brew install gitleaks` on macOS)
- [git-cliff](https://github.com/orhun/git-cliff) — for CHANGELOG generation during releases (optional, only needed by release maintainers)

### Installation

1. Clone the repo:

   ```bash
   git clone https://github.com/nicolasluckie/pwa-soundboard.git
   cd pwa-soundboard
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

   This also installs Husky git hooks automatically via the `prepare` script.

3. Set up the data directory (optional — demo sounds work out of the box):

   ```bash
   mkdir -p data/audio/user
   ```

   The `data/` directory holds your personal sounds. Demo sounds in `data/audio/demos/` are committed and work immediately. Your user sounds in `data/audio/user/` are gitignored.

4. Install Playwright browsers (for e2e tests):

   ```bash
   npx playwright install chromium
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

---

## Available Scripts

| Script                       | Description                                 |
| ---------------------------- | ------------------------------------------- |
| `npm run dev`                | Start development server (Vite + Express)   |
| `npm run build`              | Build for production                        |
| `npm run start`              | Start production server (Express)           |
| `npm run commit`             | Launch Commitizen interactive commit prompt |
| `npm run lint`               | Check formatting and lint client code       |
| `npm run format`             | Auto-format client code with Prettier       |
| `npm run test:unit`          | Run unit tests (Vitest)                     |
| `npm run test:unit:coverage` | Run unit tests with coverage report         |
| `npm run test:e2e`           | Run e2e tests (Playwright)                  |
| `npm test`                   | Run unit and e2e tests                      |

---

## Development Workflow

This project uses [Husky](https://github.com/typicode/husky) for git hooks:

- **pre-commit**: Runs `lint-staged` (Prettier + ESLint on staged files) and `gitleaks` (secret detection on staged files)
- **commit-msg**: Enforces [Conventional Commits](https://www.conventionalcommits.org/) via commitlint

Use `npm run commit` for an interactive Conventional Commits prompt (via Commitizen), or write commits manually following the format:

```
<type>(optional scope): <description>
```

See [AGENTS.md](./AGENTS.md) for the full commit message spec.

---

## Testing

### Unit tests (Vitest)

```bash
npm run test:unit
```

Tests live in `client/src/test/` and run in a jsdom environment.

### End-to-end tests (Playwright)

```bash
npm run test:e2e
```

Tests live in `client/src/e2e/`. Playwright auto-starts both the Express server (port 3000) and the Vite dev server (port 5173) — no need to run them separately. Only Chromium is configured.

In CI, e2e tests run against the production build served by the Express server using the `PW_SKIP_BUILD` env var.

### Coverage gate

Unit tests enforce a **70% minimum coverage** threshold across statements, branches, functions, and lines. The build fails if any metric drops below 70%.

```bash
npm run test:unit:coverage
```

### Run all tests

```bash
npm test
```

---

## Project Structure

```
pwa-soundboard/
├── .github/
│   └── workflows/         # CI & Release GitHub Actions
├── .husky/                # Git hooks (pre-commit, commit-msg)
├── client/                # React + Vite frontend
│   └── src/
│       ├── components/    # React components
│       ├── e2e/           # Playwright e2e tests
│       ├── hooks/         # Custom React hooks (useAudio)
│       └── test/          # Vitest unit tests
├── data/                  # Sound data (partially gitignored)
│   ├── audio/
│   │   ├── demos/         # Committed demo sounds (repo)
│   │   ├── user/          # Your personal sounds (gitignored)
│   │   └── icons/
│   │       ├── demos/     # Committed demo sound icons (repo)
│   │       └── user/      # Your personal sound icons (gitignored)
│   ├── demos.json         # Demo sound metadata (committed)
│   └── user-samples.json  # User sound metadata (gitignored)
├── docker/                # Docker build + compose overrides
│   ├── Dockerfile         # Multi-stage Docker build
│   ├── compose.dev.yaml   # Dev override (build from source)
│   └── compose.prod.yaml  # Prod override (pull prebuilt image)
├── server/                # Node.js + Express static server
├── scripts/               # Utility scripts (version-bump)
├── commitlint.config.cjs  # Conventional Commits rules
├── cliff.toml             # git-cliff CHANGELOG config
├── compose.yaml           # Base Docker Compose config
└── README.md
```

---

## Audio Files

Sounds are split into two sources, controlled by the `SOURCES` env var:

- **`data/audio/demos/`** — Committed demo sounds (included with the repo). Metadata in `data/demos.json`.
- **`data/audio/user/`** — Your personal sounds (gitignored). Metadata in `data/user-samples.json`.

The server merges both sources on the fly when `/api/samples` is called — no cache file to maintain.

### Sound Sources

The `SOURCES` env var controls which sources are loaded:

| Value        | Behavior              |
| ------------ | --------------------- |
| `demos,user` | Load both (default)   |
| `demos`      | Only repo demo sounds |
| `user`       | Only personal sounds  |

Switching is instant — just restart the server with a different `SOURCES` value.

### Adding Sounds

1. **Via the UI** — click the "Add Sound" button, select an audio or video file, fill in the metadata (name, emoji, color, tags), and submit. The server normalizes the file to MP3 via ffmpeg, saves it to `data/audio/user/`, and updates `data/user-samples.json` automatically. (Requires `user` in `SOURCES`.)
2. **Manually** — drop an `.mp3` file into `data/audio/user/`, then add an entry to `data/user-samples.json` with `id`, `name`, `file`, and `color`.

Demo sounds work out of the box — no setup required.

---

## Deployment

### Docker

The project uses a base `compose.yaml` plus environment-specific overrides in `docker/`:

**Development** (build from source):

```bash
docker compose -f compose.yaml -f docker/compose.dev.yaml build
docker compose -f compose.yaml -f docker/compose.dev.yaml up -d
```

**Production** (pull prebuilt image from GHCR):

```bash
docker compose -f compose.yaml -f docker/compose.prod.yaml up -d
```

Set `NODE_ENV=production` in your `.env` to use the production override. The server listens on port 3000 by default. Configure via environment variables — see [`.env.dev.example`](./.env.dev.example) and [`.env.prod.example`](./.env.prod.example) for all options.

### Environment Variables

| Variable   | Default            | Description                                               |
| ---------- | ------------------ | --------------------------------------------------------- |
| `HOST`     | `127.0.0.1`        | Server bind address (`0.0.0.0` for all interfaces)        |
| `PORT`     | `3000`             | Server listen port                                        |
| `ORIGIN`   | `http://HOST:PORT` | Public-facing origin(s) for CSRF checks (comma-separated) |
| `NODE_ENV` | `development`      | Deployment mode: `development` or `production`            |
| `SOURCES`  | `demos,user`       | Sound sources to load: `demos`, `user`, or `demos,user`   |
| `DATA_DIR` | `../data`          | Data directory path (set to `/data` in Docker)            |

### CI/CD

GitHub Actions workflows handle CI and releases:

- **CI & Release** (`.github/workflows/ci-release.yml`) — combined workflow with conditional job execution:
  - On PRs: lint, unit tests (with coverage + badge), build, e2e tests
  - On push to `main`: CI jobs + multi-arch Docker build (amd64 + arm64), Trivy scan, GHCR push, attestation
  - On `v*` tags: release tag promotion to versioned images

Docker images are published to `ghcr.io/nicolasluckie/pwa-soundboard`.

### Releasing

Releases are managed via `scripts/version-bump.sh` and [git-cliff](https://github.com/orhun/git-cliff):

```bash
scripts/version-bump.sh 1.0.0
git push --follow-tags
```

This bumps `package.json`, generates `CHANGELOG.md`, and creates a `v1.0.0` tag. The release workflow handles the rest.

---

## License

[MIT](./LICENSE)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
