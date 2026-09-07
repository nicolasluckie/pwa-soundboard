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
- **Icon reuse** — pick a previously-uploaded icon from a library instead of re-uploading duplicates, right from the upload dialog
- **Bulk sound config** — hand-edit `data/sounds.yaml` to add or update many sounds at once without touching the UI
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
   DATA_DIR=/data
   ```

   > | Variable   | Description                                               | Default                                                      |
   > | ---------- | --------------------------------------------------------- | ------------------------------------------------------------ |
   > | `HOST`     | Server bind address (`0.0.0.0` for all interfaces)        | `127.0.0.1`                                                  |
   > | `PORT`     | Server listen port                                        | `3000`                                                       |
   > | `ORIGIN`   | Public-facing origin(s) for CSRF checks (comma-separated) | Dev:<br>`http://HOST:PORT`<br>Prod:<br>`https://example.com` |
   > | `NODE_ENV` | Deployment mode: `development` or `production`            | `development`                                                |
   > | `DATA_DIR` | Data directory path (set to `/data` in Docker)            | `../data`                                                    |

3. Start the container:

   ```bash
   docker compose up -d
   ```

4. Open `http://localhost:3000` in your browser. Add sounds via the UI, or drop MP3s into `./data/audio/` and describe them in `./data/sounds.yaml` (copy `./data/sounds.example.yaml` to get started).

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

3. The data directory works out of the box — demo sounds are committed and load immediately. No setup needed unless you want to add your own sounds (see [Adding Sounds](#adding-sounds)).

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
│   ├── audio/             # All audio files, flat (2 demo sounds committed, rest gitignored)
│   ├── icons/             # All icon files, flat (2 demo icons committed, rest gitignored)
│   ├── sounds.yaml         # All sound metadata — hand-edited + UI-uploaded (gitignored)
│   └── sounds.example.yaml # Fallback demo content + template for sounds.yaml (committed)
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

Audio and icon files live in flat directories — `data/audio/` and `data/icons/`. All sound metadata lives in a single file: **`data/sounds.yaml`** (gitignored, personal). If that file doesn't exist yet (e.g. a fresh clone), the server falls back to the committed **`data/sounds.example.yaml`** so demo sounds work out of the box.

The server reads `sounds.yaml` on every `/api/samples` request — no cache, no restart needed. Both UI uploads and hand-edits write to the same file, so they always stay in sync.

### Adding Sounds

**Via the UI (one at a time, from anywhere):** Click "Add Sound", select an audio or video file, fill in the metadata (name, icon/emoji, color, tags), and submit. The server normalizes the file to MP3 via ffmpeg, saves it into `data/audio/` (icon into `data/icons/`), and appends the entry to `data/sounds.yaml` automatically. If an entry with the same slug already exists, it's updated in place. Existing comments and formatting in `sounds.yaml` are preserved.

For the icon, you can either upload a new image, or switch to the **"Choose existing"** tab to reuse an icon already in your library instead of uploading a duplicate. The same tab also lets you delete icons that aren't used by any sound anymore.

**Via `data/sounds.yaml` (bulk, at your desk):** Copy `data/sounds.example.yaml` to `data/sounds.yaml`, then list as many sounds as you like:

```yaml
sounds:
  - id: my-sound
    name: My Sound
    file: my-sound.mp3 # must already exist in data/audio/
    icon: /icons/my-sound.webp # optional — reuse the same icon across entries; OR use `emoji: "🔊"`
    color: "#00d4ff"
    tags: [meme]
```

Drop the referenced audio files into `data/audio/` yourself first — unlike the UI upload, `sounds.yaml` does **not** run them through ffmpeg, so pre-normalize them if needed. The file is re-read on every request, so add/edit/remove entries and refresh — no restart, no rebuild. Invalid entries (missing name, missing audio file, etc.) are skipped with a warning in the server log rather than breaking the whole list.

Demo sounds work out of the box via the `sounds.example.yaml` fallback — no setup required.

> [!TIP]
> When **manually** adding sounds to `sounds.yaml`, make sure to use the correct file paths and that the files exist in the `data/audio/` and `data/icons/` directories.
>
> Use this command to convert **audio** files to mp3:
>
> ```bash
> ffmpeg -i input.wav -vn -c:a libmp3lame -q:a 2 output.mp3
> ```
>
> Use this command to convert **images** to webp (max 256px wide, ~10 KB):
>
> ```bash
> ffmpeg -i input.png -vf scale=256:-1 -c:v libwebp -quality 80 output.webp
> ```

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
