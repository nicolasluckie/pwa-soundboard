<a name="readme-top"></a>

<h1 align="center">PWA Soundboard</h1>

<p align="center">React + Vite PWA soundboard — dark launchpad grid, instant search, overlapping playback, and offline audio caching. Upload sounds via the UI, store metadata in MongoDB, and serve via a tiny Express server. Installable on mobile and desktop.</p>

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

### Quick Start (Docker)

Pull the prebuilt image and run PWA Soundboard in minutes — no Node.js or build tools required.

1. Create a `compose.yaml` file:

   ```yaml
   services:
     pwa-soundboard:
       image: ghcr.io/nicolasluckie/pwa-soundboard:main
       container_name: pwa-soundboard
       env_file: .env
       restart: unless-stopped

       # Configure via PORT in .env or use a reverse proxy and remove the exposed port
       ports:
         - "${PORT:-3000}:${PORT:-3000}"

       # Mounts the local './data' directory to the container's '/data' directory
       # Modify the left side of the colon ('./data') to use a different local directory
       volumes:
         - ./data:/data
   ```

2. Create a `.env` file:

   ```env
   HOST=0.0.0.0
   PORT=3000
   ORIGIN=https://soundboard.example.com
   NODE_ENV=production
   SOURCES=user
   DATA_DIR=/data
   MONGODB_URI=mongodb://mongo:27017/soundboard
   ```

   > | Variable      | Description                                               | Default                                                      |
   > | ------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
   > | `HOST`        | Server bind address (`0.0.0.0` for all interfaces)        | `127.0.0.1`                                                  |
   > | `PORT`        | Server listen port                                        | `3000`                                                       |
   > | `ORIGIN`      | Public-facing origin(s) for CSRF checks (comma-separated) | Dev:<br>`http://HOST:PORT`<br>Prod:<br>`https://example.com` |
   > | `NODE_ENV`    | Deployment mode: `development` or `production`            | `development`                                                |
   > | `SOURCES`     | Sound sources to load: `demo`, `user`, or `demo,user`     | `demo,user`                                                  |
   > | `DATA_DIR`    | Data directory path (set to `/data` in Docker)            | `../data`                                                    |
   > | `MONGODB_URI` | MongoDB connection URI                                    | `mongodb://localhost:27017/soundboard`                       |

3. Start the container:

   ```bash
   docker compose up -d
   ```

   Demo sounds are seeded automatically on first boot if the database is empty.

4. Open `http://localhost:3000` in your browser. Add sounds via the UI or place MP3s in `./data/audio/`.

### Development Setup

#### Prerequisites

- [Node.js](https://nodejs.org) >= 22
- npm
- Docker (optional, for containerized deployment)
- [gitleaks](https://github.com/gitleaks/gitleaks) — for pre-commit secret scanning (`brew install gitleaks` on macOS)
- [git-cliff](https://github.com/orhun/git-cliff) — for CHANGELOG generation during releases (optional, only needed by release maintainers)

#### Installation

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

3. Start a local MongoDB instance (or use Docker — see [Deployment](#deployment)).

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
│   ├── audio/             # All audio files, flat (committed demos + gitignored user sounds)
│   └── icons/             # All icon files, flat (committed demos + gitignored user icons)
├── Dockerfile             # Multi-stage Docker build
├── server/                # Node.js + Express static server
├── scripts/               # Utility scripts (version-bump)
├── commitlint.config.cjs  # Conventional Commits rules
├── cliff.toml             # git-cliff CHANGELOG config
├── compose.yaml           # Docker Compose (prod image by default)
├── compose.override.yaml  # Dev override — auto-merged for local builds
└── README.md
```

---

## Audio Files

Sound metadata is stored in MongoDB. Audio and icon files live on the filesystem under `data/` and are served as static files.

- **`data/audio/`** — All MP3 files, flat. Demo sounds are committed; user-uploaded sounds are gitignored.
- **`data/icons/`** — All icon images (WebP/PNG), flat. Demo icons are committed; user icons are gitignored.

### Sound Sources

The `SOURCES` env var filters which sounds are returned by the API, based on the `source` field (`demo` or `user`) stored in MongoDB:

| Value       | Behavior              |
| ----------- | --------------------- |
| `demo,user` | Load both (default)   |
| `demo`      | Only repo demo sounds |
| `user`      | Only personal sounds  |

Switching is instant — just restart the server with a different `SOURCES` value.

### Adding Sounds

1. **Via the UI** — click the "Add Sound" button, select an audio or video file, fill in the metadata (name, emoji, color, tags), and submit. The server normalizes the file to MP3 via ffmpeg, saves it to `data/audio/`, stores the icon in `data/icons/`, and upserts the metadata into MongoDB. (Requires `user` in `SOURCES`.)

Demo sounds are committed to `data/audio/` and `data/icons/` and seeded into MongoDB automatically on first boot (Docker) or via `npm run migrate` (local dev).

---

## Deployment

### Docker

`compose.yaml` uses the prebuilt GHCR image. A `compose.override.yaml` at the repo root is automatically merged by Docker Compose for local development (builds from source).

**Development** (build from source — `compose.override.yaml` auto-merged):

```bash
docker compose up -d
```

**Production** (pull prebuilt image, skip override):

```bash
docker compose -f compose.yaml up -d
```

The server listens on port 3000 by default. Configure via environment variables — see [`.env.dev.example`](./.env.dev.example) and [`.env.prod.example`](./.env.prod.example) for all options.

### Environment Variables

| Variable      | Default                                | Description                                               |
| ------------- | -------------------------------------- | --------------------------------------------------------- |
| `HOST`        | `127.0.0.1`                            | Server bind address (`0.0.0.0` for all interfaces)        |
| `PORT`        | `3000`                                 | Server listen port                                        |
| `ORIGIN`      | `http://HOST:PORT`                     | Public-facing origin(s) for CSRF checks (comma-separated) |
| `NODE_ENV`    | `development`                          | Deployment mode: `development` or `production`            |
| `SOURCES`     | `demo,user`                            | Sound sources to load: `demo`, `user`, or `demo,user`     |
| `DATA_DIR`    | `../data`                              | Data directory path (set to `/data` in Docker)            |
| `MONGODB_URI` | `mongodb://localhost:27017/soundboard` | MongoDB connection URI                                    |

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
